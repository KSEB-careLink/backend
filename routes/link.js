// routes/link.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

router.post('/patient', authWithRole(['patient']), async (req, res) => {
  const { joinCode } = req.body;
  const patientUid = req.user.uid;
  try {
    const codeDoc = await db.collection('joinCodes').doc(joinCode).get();
    if (!codeDoc.exists) return res.status(400).json({ error: '유효하지 않은 코드입니다.' });
    const guardianId = codeDoc.data().guardianId;

    await db.collection('users').doc(patientUid).update({ linkedGuardian: guardianId });
    await db.collection('users').doc(guardianId).update({
      linkedPatients: admin.firestore.FieldValue.arrayUnion(patientUid)
    });

    res.status(200).json({ message: '연동 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
