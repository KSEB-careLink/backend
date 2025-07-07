const express = require('express');
const admin = require('../firebase');
const router = express.Router();

//확인용
router.get('/ping', (req, res) => {
  res.send('pong');
});


// 연동 코드 생성 함수
function generateLinkCode(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * 보호자 회원가입 및 역할 저장
 * @route POST /users/register
 * @body { idToken: string, role: 'guardian' }
 */
router.post('/register', async (req, res) => {
  const { idToken, role } = req.body;

  if (role !== 'guardian') {
    return res.status(400).json({ error: 'Only guardian role is allowed in registration.' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const linkCode = generateLinkCode();

    await userRef.set({
      email,
      role,
      linkCode,
      createdAt: new Date()
    });

    res.status(201).json({
      message: 'Guardian registered successfully',
      linkCode
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 환자 연동 - 보호자의 linkCode 입력 (익명 로그인 후 요청)
 * @route POST /users/link
 * @body { idToken: string, linkCode: string }
 */
router.post('/link', async (req, res) => {
  const { idToken, linkCode } = req.body;

  if (!idToken || !linkCode) {
    return res.status(400).json({ error: 'idToken and linkCode are required' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const patientUid = decoded.uid;
    const email = decoded.email || null; // 익명 계정일 경우 email 없음

    const db = admin.firestore();

    // 보호자 찾기
    const guardianSnap = await db.collection('users')
      .where('role', '==', 'guardian')
      .where('linkCode', '==', linkCode)
      .limit(1)
      .get();

    if (guardianSnap.empty) {
      return res.status(404).json({ error: 'Invalid link code' });
    }

    const guardianDoc = guardianSnap.docs[0];
    const guardianUid = guardianDoc.id;

    // 환자 문서 생성
    await db.collection('users').doc(patientUid).set({
      email,
      role: 'patient',
      guardianId: guardianUid,
      createdAt: new Date()
    });

    res.status(201).json({ message: 'Patient linked to guardian successfully' });

  } catch (err) {
    console.error('Linking error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
