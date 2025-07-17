const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

const authWithRole = require('../middlewares/authWithRole');
const { db } = require('../firebase');

// Multer 설정
const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  authWithRole(['guardian']),
  upload.none(), // form-data의 텍스트 필드만 받을 때 (파일 없음)
  async (req, res) => {
    const { uid } = req.user;
    const { patientId, patientName, photoDescription, relationship, tone } = req.body;

    try {
      const selectedVoiceId = req.body.voiceId;

      // 👉 기본 voiceId는 .env에 저장된 값
      const DEFAULT_VOICE_ID = process.env.DEFAULT_VOICE_ID;

      // 👉 기본 선택 시 실제 voiceId로 치환
      let voiceId = selectedVoiceId === 'default' ? DEFAULT_VOICE_ID : selectedVoiceId;

      // 선택되지 않은 경우 → Firestore에서 가져오기
      if (!voiceId) {
        const guardianDoc = await db.collection('guardians').doc(uid).get();
        if (!guardianDoc.exists) {
          return res.status(404).json({ error: '보호자 정보가 없습니다.' });
        }
        voiceId = guardianDoc.data().voiceId;
        if (!voiceId) {
          return res.status(400).json({ error: 'voiceId가 없습니다. 먼저 목소리를 등록하세요.' });
        }
      }


      const formData = new FormData();
      formData.append('guardian_uid', uid);
      formData.append('patient_uid', patientId);
      formData.append('voice_id', voiceId);
      formData.append('patient_name', patientName);
      formData.append('photo_description', photoDescription);
      formData.append('relationship', relationship || '보호자');
      formData.append('tone', tone || 'neutral');

      const pythonUrl = 'http://localhost:8000/generate-and-read';
      const response = await axios.post(pythonUrl, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("✅ Python 응답:", response.data);

      res.status(200).json({
        message: '회상 문장 생성 성공',
        data: response.data,
      });

    } catch (err) {
      console.error('[회상 문장 생성 오류]', err);
      res.status(500).json({ error: '회상 문장 생성 중 오류', detail: err.message });
    }
  }
);

module.exports = router;
