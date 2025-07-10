const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

router.get('/:patientId', authWithRole(['patient']), async (req, res) => {
  const { patientId } = req.params;
  const callerUid = req.user.uid;

  if (callerUid !== patientId) {
    return res.status(403).json({ error: '본인만 조회할 수 있습니다.' });
  }

  try {
    const patientDoc = await db.collection('users').doc(patientId).get();
    if (!patientDoc.exists) {
      return res.status(404).json({ error: '환자 정보가 없습니다.' });
    }

    const guardianId = patientDoc.data().linkedGuardian;
    if (!guardianId) return res.status(404).json({ error: '보호자가 없습니다.' });

    const guardianDoc = await db.collection('users').doc(guardianId).get();
    if (!guardianDoc.exists) {
      return res.status(404).json({ error: '보호자 정보가 존재하지 않습니다.' });
    }

    res.status(200).json({
      guardianId,
      guardianName: guardianDoc.data().name
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
