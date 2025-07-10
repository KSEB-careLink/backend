const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const { v4: uuidv4 } = require('uuid');
const authWithRole = require('../middlewares/authWithRole'); // 또는 verifyToken만 사용해도 됨

router.post('/', authWithRole(['guardian']), async (req, res) => {
  const { uid, email } = req.user;
  const { name } = req.body;

  try {
    const existing = await db.collection('users').doc(uid).get();
    if (existing.exists) {
      return res.status(400).json({ error: '이미 등록된 보호자입니다.' });
    }

    const joinCode = uuidv4().slice(0, 6);

    await db.collection('users').doc(uid).set({
      name,
      email,
      role: 'guardian',
      linkedPatients: []
    });

    await db.collection('joinCodes').doc(joinCode).set({
      guardianId: uid,
      createdAt: new Date()
    });

    res.status(200).json({ uid, joinCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
