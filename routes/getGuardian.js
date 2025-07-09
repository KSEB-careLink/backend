const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

router.get('/:patientId', async (req, res) => {
  const { patientId } = req.params;

  try {
    const patientDoc = await db.collection('users').doc(patientId).get();
    const guardianId = patientDoc.data().linkedGuardian;

    if (!guardianId) return res.status(404).json({ error: '보호자가 없습니다.' });

    const guardianDoc = await db.collection('users').doc(guardianId).get();

    res.status(200).json({
      guardianId,
      guardianName: guardianDoc.data().name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
