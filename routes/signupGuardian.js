const express = require('express');
const router = express.Router();
const { db, auth } = require('../firebase');
const { v4: uuidv4 } = require('uuid');

router.post('/', async (req, res) => {
  const { email, password, name } = req.body;

  try {
    const user = await auth.createUser({ email, password, displayName: name });

    const joinCode = uuidv4().slice(0, 6); // 예: 'a1b2c3'

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
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
