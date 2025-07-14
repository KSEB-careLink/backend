// routes/auth.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { admin, db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

//회원가입
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
    const data = { name, email, role };

    if (role === 'guardian') {
      data.linkedPatients = [];
    }

    await db.collection('users').doc(uid).set(data);

    if (role === 'guardian') {
      const joinCode = uuidv4().slice(0, 6);
      await db.collection('joinCodes').doc(joinCode).set({
        guardianId: uid,
        createdAt: new Date(),
      });
      return res.status(200).json({ uid, joinCode });
    } else {
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

//로그인한 사용자 정보 조회
router.get('/me', authWithRole(['guardian', 'patient']), async (req, res) => {
  const { uid, role, name, email } = req.user;
  res.status(200).json({ uid, role, name, email });
});

//joinCode 유효성 검사
router.post('/verify-join-code', async (req, res) => {
  const { joinCode } = req.body;

  if (!joinCode) {
    return res.status(400).json({ error: 'joinCode가 필요합니다.' });
  }

  try {
    const doc = await db.collection('joinCodes').doc(joinCode).get();

    if (!doc.exists) {
      return res.status(404).json({ error: '유효하지 않은 코드입니다.' });
    }

    const { guardianId } = doc.data();
    return res.status(200).json({ guardianId });
  } catch (err) {
    console.error('[verify-join-code error]', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
