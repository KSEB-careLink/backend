// routes/voicememory.js
/* [보호자 앱]
└─ POST /memory (사진+텍스트+관계+환자 정보 포함)
   └─ 인증된 보호자가 요청
      └─ 환자 문서 확인 + tone 가져옴
         └─ FastAPI로 FormData 전송
            └─ 회상 문장 + 퀴즈 + tts_url 응답
               └─ Firestore memory_logs 저장
                  └─ 응답 반환 + 임시 파일 삭제
*/

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

router.post( // 인증된 보호자만 호출 가능, fromdata 내 file 필드 수신
  '/',
  authWithRole(['guardian']),
  upload.single('file'),   
  async (req, res) => {
    const { uid } = req.user;
    const { patientId, patientName, photoDescription, relationship } = req.body;
    const file = req.file;
    if (!patientId || !file) {
      return res.status(400).json({ error: 'patientId와 file 모두 필요합니다.' });
    }

    try {
      // Firestore patients/{patientId} 조회, 보호자가 맞는 지 확인
      // tone은 회상 문장 스타일 조정용
      const patientDoc = await db.collection('patients').doc(patientId).get();
      if (!patientDoc.exists || patientDoc.data().guardian_uid !== uid) {
        return res
          .status(patientDoc.exists ? 403 : 404)
          .json({ error: '이 환자를 관리할 권한이 없습니다.' });
      }
      const tone = patientDoc.data().tone;

      // Python 서버에 보낼 FormData 구성
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

      // 회상 로그 firestore 저장
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
  }); // 응답 받은 내용 그대로 memory_logs 하위 컬렉션에 저장
  
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
