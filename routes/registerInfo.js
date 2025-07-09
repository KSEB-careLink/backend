const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { v4: uuidv4 } = require('uuid');
const authWithRole = require('../middlewares/authWithRole'); // 또는 verifyToken만 사용해도 됨

router.post('/', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '토큰 필요' });
  }

  const idToken = authHeader.split(' ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const { name } = req.body;
    const joinCode = uuidv4().slice(0, 6);

    await db.collection('users').doc(uid).set({
      name,
      email: decodedToken.email,
      role: 'guardian',
      linkedPatients: []
    });

    await db.collection('joinCodes').doc(joinCode).set({
      guardianId: uid,
      createdAt: new Date()
    });

    res.status(200).json({ uid, joinCode });
  } catch (err) {
    res.status(403).json({ error: '토큰 검증 실패' });
  }
});

module.exports = router;
