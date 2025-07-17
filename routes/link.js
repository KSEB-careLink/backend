//routes/link.js
const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

// 환자 → 보호자 연동
router.post('/patient', authWithRole(['patient']), async (req, res) => {
  const { joinCode } = req.body;
  const patientUid = req.user.uid;

  try {
    const codeDoc = await db.collection('joinCodes').doc(joinCode).get();
    if (!codeDoc.exists) return res.status(400).json({ error: '유효하지 않은 코드입니다.' });

    const guardianId = codeDoc.data().guardianId;

    await db.collection('patients').doc(patientUid).update({ linkedGuardian: guardianId });

    await db.collection('guardians').doc(guardianId).update({
      linkedPatients: admin.firestore.FieldValue.arrayUnion(patientUid),
    });

    res.status(200).json({ message: '연동 완료' });
  } catch (err) {
    console.error('연동 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
