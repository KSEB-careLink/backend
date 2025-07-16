// routes/register.js 환자 등록
const express = require('express');
const admin = require('firebase-admin');
const router = express.Router();

// Firebase Firestore 참조
const db = admin.firestore();

// Firebase 인증 미들웨어 (ID 토큰 검증)
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing or malformed' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// POST /patients/register
router.post('/register', authenticate, async (req, res) => {
  const { name, birthDate, relationship, tone } = req.body;
  const guardianUid = req.user.uid;

  if (!name || !birthDate || !relationship || !tone) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  try {
    // Firestore에 환자 정보 저장
    const patientRef = await db.collection('patients').add({
      name,
      birthDate,
      relationship,
      tone,
      linkedGuardian: admin.firestore.FieldValue.arrayUnion(
        guardianUid
      ),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 보호자 문서에 환자 ID 연결
    const guardianRef = db.collection('guardians').doc(guardianUid);
    await guardianRef.set({
      linkedPatients: admin.firestore.FieldValue.arrayUnion(patientRef.id)
    }, { merge: true });

    res.status(201).json({
      patientId: patientRef.id,
      message: '환자 등록 완료'
    });
  } catch (error) {
    console.error('환자 등록 실패:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
