const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const authWithRole = require('../middlewares/authWithRole');
const upload = multer({ dest: 'uploads/' });

router.post(
  '/',
  authWithRole(['guardian']),
  upload.single('file'),
  async (req, res) => {
    const { uid, name } = req.user;
    const file = req.file;

    try {
      const regFormData = new FormData();
      regFormData.append('guardian_uid', uid);
      regFormData.append('name', name || 'GuardianName');
      regFormData.append('file', fs.createReadStream(file.path));

      const regResponse = await axios.post('http://localhost:8000/register-voice', regFormData, {
        headers: regFormData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log("✅ Python 응답:", regResponse.data);

      fs.unlinkSync(file.path);

      res.status(200).json({
        message: '목소리 등록 성공',
        voice_id: regResponse.data.voice_id,
      });

    } catch (err) {
      console.error('[목소리 등록 오류]', err);
      if (file && file.path) {
        fs.unlinkSync(file.path);
      }
      res.status(500).json({ error: '목소리 등록 중 오류', detail: err.message });
    }
  }
);

module.exports = router;
