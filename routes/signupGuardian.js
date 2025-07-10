const express = require('express');
const router = express.Router();
const { db, auth } = require('../firebase');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const user = await auth.createUser({ email, password, displayName: name });

    const joinCode = uuidv4().slice(0, 6);

    await db.collection('users').doc(user.uid).set({
      role: 'guardian',
      name,
      email,
      linkedPatients: []
    });

    await db.collection('joinCodes').doc(joinCode).set({
      guardianId: user.uid,
      createdAt: new Date()
    });

    res.status(200).json({ uid: user.uid, joinCode });
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }
    res.status(500).json({ error: '회원가입 중 문제가 발생했습니다.' });
  }
});
