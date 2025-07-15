// routes/voice.js
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
  '/register',
  authWithRole(['guardian']),
  upload.single('file'),   // form-data field name: 'file'
  async (req, res) => {
    const { uid } = req.user;
    const { patientId } = req.body;
    const file = req.file;

    if (!patientId || !file) {
      return res.status(400).json({ error: 'patientId, audio file 모두 필요합니다.' });
    }

    try {
      //환자 문서 조회 & 권한 확인
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (!patientDoc.exists) {
        return res.status(404).json({ error: '환자 정보가 없습니다.' });
      }
      const patientData = patientDoc.data();
      if (patientData.guardian_uid !== uid) {
        return res.status(403).json({ error: '이 환자를 관리할 권한이 없습니다.' });
      }

      //tone 추출
      const tone = patientData.tone;

      //FastAPI 호출 (음성 클로닝)
      const formData = new FormData();
      formData.append('uid', uid);
      formData.append('tone', tone);
      formData.append('audio_file', fs.createReadStream(file.path));

      const fastapiRes = await axios.post(
        'fastapi 주소',
        formData,
        { headers: formData.getHeaders() }
      );
      const { voiceUrl } = fastapiRes.data;

      //Firestore에 voiceId 저장
      await db.collection('users').doc(uid).update({ voiceId: voiceUrl });

      //임시 파일 삭제 & 응답
      fs.unlinkSync(file.path);
      return res.json({ success: true, voiceUrl });

    } catch (err) {
      console.error('[Voice Register Error]', err);
      if (file && file.path) fs.unlinkSync(file.path);
      return res.status(500).json({ error: 'Voice registration failed', detail: err.message });
    }
  }
);

module.exports = router;
