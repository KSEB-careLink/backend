// routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { admin, db } = require('../firebase');

router.post('/signup', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!['guardian', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'role은 guardian 또는 patient여야 합니다.' });
  }
  try {
    const user = await admin.auth().createUser({ email, password, displayName: name });
    const uid = user.uid;
    const data = { name, email, role };
    if (role === 'guardian') {
      data.linkedPatients = [];
    }
    await db.collection('users').doc(uid).set(data);
    if (role === 'guardian') {
      const joinCode = uuidv4().slice(0, 6);
      await db.collection('joinCodes').doc(joinCode).set({ guardianId: uid, createdAt: new Date() });
      return res.status(200).json({ uid, joinCode });
    } else {
      return res.status(200).json({ uid });
    }
  } catch (err) {
  console.error("[signup error]", err);  // 이거 추가!
  if (err.code === 'auth/email-already-exists') {
    return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
  }
  res.status(500).json({ error: err.message });
}
  
});

module.exports = router;
