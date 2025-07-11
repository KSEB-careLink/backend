const express = require('express');
const admin = require('../firebase');
const router = express.Router();

/**
 * 보호자의 환자 리스트 조회
 * @route GET /patients
 * @header Authorization: Bearer <Firebase ID Token>
 */
router.get('/', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.firestore();
    const patientsRef = db.collection('users').doc(uid).collection('patients');
    const snapshot = await patientsRef.get();

    const patients = snapshot.docs.map(doc => ({
      patientId: doc.id,
      ...doc.data()
    }));

    res.json(patients);

  } catch (err) {
    console.error('Failed to get patient list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
