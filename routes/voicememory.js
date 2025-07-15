// routes/voicememory.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const authWithRole = require('../middlewares/authWithRole');
const { db } = require('../firebase');

// Multer 설정 (uploads/에 임시 저장)
const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  authWithRole(['guardian']),
  upload.single('file'),   // form-data field name: 'file'
  async (req, res) => {
    const { uid } = req.user;
    const { patientId, patientName, photoDescription, relationship } = req.body;
    const file = req.file;
    if (!patientId || !file) {
      return res.status(400).json({ error: 'patientId와 file 모두 필요합니다.' });
    }

    try {
      // patients 컬렉션에서 tone 조회 & 권한 확인
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (!patientDoc.exists || patientDoc.data().guardian_uid !== uid) {
        return res
          .status(patientDoc.exists ? 403 : 404)
          .json({ error: '이 환자를 관리할 권한이 없습니다.' });
      }
      const tone = patientDoc.data().tone;

      // Python 서버에 보낼 FormData 구성 (req.body.tone 제거)
      const formData = new FormData();
      formData.append('guardian_uid', uid);
      formData.append('name', req.user.name || 'GuardianName');
      formData.append('file', fs.createReadStream(file.path));
      formData.append('patient_name', patientName);
      formData.append('photo_description', photoDescription);
      formData.append('relationship', relationship || '보호자');
      formData.append('tone', tone);

      // FastAPI 호출 & 응답 처리
      const pythonUrl = 'http://localhost:8000/generate-and-read';
      const response = await axios.post(pythonUrl, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      await db
     .collection('patients').doc(patientId)
     .collection('memory_logs').add({
     photo_description,
     reminder_text: response.data.reminder_text,
     tts_url:    response.data.tts_url,
     generated_quiz: response.data.generated_quiz,
     topic:      response.data.topic,
     tone:       patientDoc.data().tone,
     created_at: admin.firestore.FieldValue.serverTimestamp()
  });
  
      // 임시 파일 삭제
      fs.unlinkSync(file.path);

      // 클라이언트에 결과 반환
      return res.status(200).json({
        message: '회상문장 생성 성공',
        data: response.data,
      });

    } catch (err) {
      console.error('[Memory Generation Error]', err);
      if (file && file.path) fs.unlinkSync(file.path);
      return res
        .status(500)
        .json({ error: '회상 생성 중 오류 발생', detail: err.message });
    }
  }
);

module.exports = router;
