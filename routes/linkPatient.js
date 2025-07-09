const express = require('express');
const router = express.Router();
const { db, auth } = require('../firebase');

router.post('/', async (req, res) => {
  const { patientUid, joinCode, name } = req.body;

  try {
    const codeDoc = await db.collection('joinCodes').doc(joinCode).get();
    if (!codeDoc.exists) {
      return res.status(400).json({ error: '유효하지 않은 연동 코드입니다.' });
    }

    const guardianId = codeDoc.data().guardianId;

    // 환자 등록
    await db.collection('users').doc(patientUid).set({
      role: 'patient',
      name,
      linkedGuardian: guardianId
    });

    // 보호자에 환자 추가
    await db.collection('users').doc(guardianId).update({
      linkedPatients: admin.firestore.FieldValue.arrayUnion(patientUid)
    });

    res.status(200).json({ message: '연동 완료' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
