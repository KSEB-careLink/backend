const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

router.post('/', authWithRole(['patient']), async (req, res) => {
  const { joinCode, name } = req.body;
  const patientUid = req.user.uid;

  try {
    const codeDoc = await db.collection('joinCodes').doc(joinCode).get();
    if (!codeDoc.exists) {
      return res.status(400).json({ error: '유효하지 않은 연동 코드입니다.' });
    }

    const guardianId = codeDoc.data().guardianId;

    const existingPatient = await db.collection('users').doc(patientUid).get();
    if (existingPatient.exists) {
      return res.status(400).json({ error: '이미 연동된 환자입니다.' });
    }

    await db.collection('users').doc(patientUid).set({
      role: 'patient',
      name,
      linkedGuardian: guardianId
    });

    await db.collection('users').doc(guardianId).update({
      linkedPatients: admin.firestore.FieldValue.arrayUnion(patientUid)
    });

    res.status(200).json({ message: '연동 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
