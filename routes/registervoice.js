const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const admin = require('firebase-admin');

const authWithRole = require('../middlewares/authWithRole');
const { db } = require('../firebase');

const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  authWithRole(['guardian']),
  upload.none(), // 텍스트 필드만 받음 (파일 없음)
  async (req, res) => {
    const { uid } = req.user;
    const { patientId, patientName, photoDescription, relationship, tone } = req.body;

    try {
      // 보호자 확인
      const guardianDoc = await db.collection('guardians').doc(uid).get();
      if (!guardianDoc.exists) {
        return res.status(404).json({ error: '보호자 정보가 없습니다.' });
      }

      const voiceId = guardianDoc.data().voiceId;
      if (!voiceId) {
        return res.status(400).json({ error: 'voiceId가 없습니다. 먼저 목소리를 등록하세요.' });
      }

      // 회상 생성 요청
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

      const { reminder_text, tts_url, generated_quiz, topic } = response.data;

      // Firestore 저장
      await db.collection('patients').doc(patientId).collection('memory_logs').add({
        photo_description,
        reminder_text,
        tts_url,
        generated_quiz,
        topic,
        tone: tone || 'neutral',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({
        message: '회상 문장 생성 및 저장 성공',
        data: response.data,
      });

    } catch (err) {
      console.error('[회상 문장 생성 오류]', err);
      res.status(500).json({ error: '회상 문장 생성 중 오류', detail: err.message });
    }
  }
);

module.exports = router;
