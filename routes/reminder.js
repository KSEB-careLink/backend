const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const authWithRole = require('../middlewares/authWithRole');
const { db } = require('../firebase');

// Multer 세팅 (임시 디렉토리에 파일 저장)
const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  authWithRole(['guardian']),
  upload.single('file'),
  async (req, res) => {
    console.log("✅ 요청 수신됨!");
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    console.log("req.user:", req.user);

    const { uid, name } = req.user;
    const { patientId, patientName, photoDescription, relationship, tone } = req.body;
    const file = req.file;

    try {
      // ✅ Firestore에서 환자 문서 확인
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (!patientDoc.exists) {
        console.log("❌ 환자 정보 없음 — 404 반환");
        return res.status(404).json({ error: '환자 정보가 없습니다.' });
      }
      if (!patientDoc.data().linkedGuardian?.includes(uid)) {
        console.log("❌ linkedGuardian 불일치 — 403 반환");
        return res.status(403).json({ error: '이 환자를 관리할 권한이 없습니다.' });
      }

      // ✅ Firestore에서 보호자 문서 확인 및 voiceId 가져오기
      const guardianDoc = await db.collection('guardians').doc(uid).get();
      if (!guardianDoc.exists) {
        return res.status(404).json({ error: '보호자 정보가 없습니다.' });
      }

      let voiceId = guardianDoc.data().voiceId;

      // ✅ voiceId 없으면 Python에 자동 등록 요청
      if (!voiceId) {
        console.log("⚠️ voiceId 없음 → Python에 자동 등록 요청!");

        const regFormData = new FormData();
        regFormData.append('guardian_uid', uid);
        regFormData.append('name', name || 'GuardianName');
        regFormData.append('file', fs.createReadStream(file.path));

        const regResponse = await axios.post('http://localhost:8000/register-voice', regFormData, {
          headers: regFormData.getHeaders(),
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        });

        console.log("✅ Python 자동 등록 완료!", regResponse.data);

        voiceId = regResponse.data.voice_id;
      }

      // ✅ Python에 회상문장 생성 요청
      const formData = new FormData();
      formData.append('guardian_uid', uid);
      formData.append('patient_uid', patientId);
      formData.append('voice_id', voiceId);
      formData.append('name', name || 'GuardianName');
      formData.append('file', fs.createReadStream(file.path));
      formData.append('patient_name', patientName);
      formData.append('photo_description', photoDescription);
      formData.append('relationship', relationship || '보호자');
      formData.append('tone', tone || 'neutral');

      console.log("✅ Python 서버 전송 준비 완료!");

      const pythonUrl = 'http://localhost:8000/generate-and-read';
      const response = await axios.post(pythonUrl, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("✅ Python 응답 수신 완료!");
      console.log("Python 응답 데이터:", response.data);

      // ✅ 파일 삭제 (임시 파일 정리)
      fs.unlinkSync(file.path);
      console.log("✅ 임시 파일 삭제 완료");

      res.status(200).json({
        message: 'Python 서버에 전송 및 회상문장 생성 성공',
        data: response.data,
      });

    } catch (err) {
      console.error('[Node → Python 연동 오류]', err);
      if (file && file.path) {
        try {
          fs.unlinkSync(file.path);
          console.log("✅ 오류 발생 시 임시 파일 삭제 완료");
        } catch (e) {
          console.error("파일 삭제 중 추가 오류:", e);
        }
      }
      res.status(500).json({ error: 'Python 서버 연동 중 오류 발생', detail: err.message });
    }
  }
);

module.exports = router;
