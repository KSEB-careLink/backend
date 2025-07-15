//routes/voicememory.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const authWithRole = require('../middlewares/authWithRole');
const { db } = require('../firebase');

//Multer 설정 (uploads/에 임시 저장)
const upload = multer({ dest: 'uploads/' });

router.post(
  '/', 
  authWithRole(['guardian']), 
  upload.single('file'),   // form-data field name: 'file'
  async (req, res) => {
    console.log("요청 수신됨");
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);
    console.log("req.user:", req.user);

    const { uid } = req.user;
    const { patientId, patientName, photoDescription, relationship, tone } = req.body;
    const file = req.file;

    try {
      //Firestore에서 환자 문서 확인
      const patientDoc = await db.collection('users').doc(patientId).get();
      if (!patientDoc.exists) {
        return res.status(404).json({ error: '환자 정보가 없습니다.' });
      }
      if (patientDoc.data().linkedGuardian !== uid) {
        return res.status(403).json({ error: '이 환자를 관리할 권한이 없습니다.' });
      }

      //Python 서버에 보낼 FormData 구성
      const formData = new FormData();
      formData.append('guardian_uid', uid);
      formData.append('name', req.user.name || 'GuardianName');
      formData.append('file', fs.createReadStream(file.path));
      formData.append('patient_name', patientName);
      formData.append('photo_description', photoDescription);
      formData.append('relationship', relationship || '보호자');
      formData.append('tone', tone || 'neutral');

      console.log("Python 서버 전송 준비 완료!");

      //FastAPI 호출
      const pythonUrl = 'fastapi 주소';
      const response = await axios.post(pythonUrl, formData, {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("Python 응답 수신 완료!", response.data);

      //임시 파일 삭제
      fs.unlinkSync(file.path);

      //클라이언트에 결과 반환
      return res.status(200).json({
        message: '회상문장 생성 성공',
        data: response.data,
      });

    } catch (err) {
      console.error('[Memory Generation Error]', err);
      if (file && file.path) fs.unlinkSync(file.path);
      return res.status(500).json({ error: '회상 생성 중 오류 발생', detail: err.message });
    }
  }
);

module.exports = router;
