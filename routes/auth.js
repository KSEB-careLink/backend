//routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { admin, db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

// 회원가입
router.post('/signup', async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!['guardian', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'role은 guardian 또는 patient여야 합니다.' });
  }

  try {
    const user = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    const uid = user.uid;
    const commonData = { name, email, role };

    if (role === 'guardian') {
      const joinCode = uuidv4().slice(0, 6);

      await db.collection('guardians').doc(uid).set({
        ...commonData,
        linkedPatients: [],
        joinCode,
      });

      await db.collection('joinCodes').doc(joinCode).set({
        guardianId: uid,
        createdAt: new Date(),
      });

      return res.status(200).json({ uid, joinCode });
    } else {
      await db.collection('patients').doc(uid).set({
        ...commonData,
        linkedGuardian: null,
      });

      return res.status(200).json({ uid });
    }
  } catch (err) {
    console.error("[signup error]", err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: '이미 존재하는 이메일입니다.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// 로그인한 사용자 정보 조회
router.get('/me', authWithRole(['guardian', 'patient']), async (req, res) => {
  const { uid, role } = req.user;
  try {
    const doc = await db.collection(role === 'guardian' ? 'guardians' : 'patients').doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: '사용자 정보 없음' });
    res.status(200).json({ uid, role, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: '정보 조회 실패' });
  }
});

module.exports = router;
