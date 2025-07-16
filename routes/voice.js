// routes/voice.js
/* 전체 흐름 요약 
 [보호자 앱] → /voice/register → [Node.js] → 
 [FastAPI] → voiceUrl 반환 → Firestore 저장 */
 
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const admin = require('firebase-admin');             // ← 추가
const authWithRole = require('../middlewares/authWithRole');
const { db } = require('../firebase');

// Multer 설정 (uploads/에 임시 저장)
const upload = multer({ dest: 'uploads/' });

router.post(
  '/register',
  authWithRole(['guardian']),
  upload.single('file'),
  async (req, res) => {
    const { uid } = req.user;
    const { patientId } = req.body;
    const file = req.file;
    if (!patientId || !file) {
      return res.status(400).json({ error: 'patientId와 audio file 모두 필요합니다.' });
    }

    try {
      // 환자 문서 조회 & 권한 확인
      // 보호자 uid와 일치하는 지 검증, 없거나 불일치하면 오류 반환
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (!patientDoc.exists || patientDoc.data().guardian_uid !== uid) {
        return res
          .status(patientDoc.exists ? 403 : 404)
          .json({ error: '이 환자를 관리할 권한이 없습니다.' });
      }

      // FastAPI에 음성 파일만 전송
      // fromdata를 구성하여 FastAPI의 /generate-and-read에 전송
      // FastAPI는 음성을 클로닝하고 voiceUrl (mp3 파일 링크)을 응답
      const formData = new FormData();
      formData.append('uid', uid);
      formData.append('audio_file', fs.createReadStream(file.path));

      const fastapiRes = await axios.post(
        'http://localhost:8000/generate-and-read',
        formData,
        { headers: formData.getHeaders() }
      );
      const { voiceUrl } = fastapiRes.data;

      // Firestore에 voiceUrls 배열로 저장 (최대 3개까지)
      await db
        .collection('guardians') //user에서 변경
        .doc(uid)
        .update({
          voiceUrls: admin.firestore.FieldValue.arrayUnion(voiceUrl)
        });

      // 임시 파일 삭제 & 응답
      fs.unlinkSync(file.path);
      return res.json({ success: true, voiceUrl });

    } catch (err) { // 오류 처리
      console.error('[Voice Register Error]', err);
      if (file && file.path) fs.unlinkSync(file.path);
      return res
        .status(500)
        .json({ error: 'Voice registration failed', detail: err.message });
    }
  }
);

module.exports = router;
