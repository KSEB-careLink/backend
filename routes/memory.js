const express = require('express');
const multer = require('multer');
const { admin, db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');
const router = express.Router();

// multer 메모리 저장 설정
const upload = multer({ storage: multer.memoryStorage() });

// POST /memory/upload
router.post('/upload', authWithRole(['guardian']), upload.single('media'), async (req, res) => {
  const { description, patientId } = req.body;
  const file = req.file;
  const guardianUid = req.user.uid;

  if (!file || !description || !patientId) {
    return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
  }

  try {
    const mediaType = file.mimetype.startsWith('image') ? 'image' : 'video';
    const filename = `${Date.now()}_${file.originalname}`;
    const mediaPath = `memory/${patientId}/${filename}`;

    const bucket = admin.storage().bucket();
    const fileRef = bucket.file(mediaPath);

    // Firebase Storage에 파일 업로드
    await fileRef.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
      },
    });

    // Firestore에 metadata 저장
    const docRef = await db.collection('memoryItems').add({
      patientId,
      guardianId: guardianUid,
      mediaPath,
      mediaType,
      description,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.status(201).json({ message: '업로드 완료', itemId: docRef.id });
  } catch (err) {
    console.error('업로드 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// GET /memory/list/:patientId
router.get('/list/:patientId', authWithRole(['guardian', 'patient']), async (req, res) => {
  const { patientId } = req.params;

  try {
    const snapshot = await db.collection('memoryItems')
      .where('patientId', '==', patientId)
      .orderBy('createdAt', 'desc')
      .get();

    const memoryItems = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        mediaPath: data.mediaPath,
        mediaType: data.mediaType,
        description: data.description,
        createdAt: data.createdAt?.toDate() ?? null
      };
    });

    res.status(200).json({ memoryItems });
  } catch (err) {
    console.error('조회 실패:', err);
    res.status(500).json({ error: '조회 실패' });
  }
});

module.exports = router;
