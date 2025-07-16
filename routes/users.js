// routes/users.js
const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase')
const authWithRole = require('../middlewares/authWithRole');

// 환자 → 보호자 정보 조회
router.get('/get-guardian/:patientId', authWithRole(['patient']), async (req, res) => {
  const { patientId } = req.params;
  if (req.user.uid !== patientId) return res.status(403).json({ error: '본인만 조회 가능' });
  try {
    const patientDoc = await db.collection('patients').doc(patientId).get();
    const guardianId = patientDoc.data().linkedGuardian;
    if (!guardianId) return res.status(404).json({ error: '보호자 없음' });
    const guardianDoc = await db.collection('guardians').doc(guardianId).get();
    res.status(200).json({ guardianId, guardianName: guardianDoc.data().name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 보호자 → 환자 목록 조회
router.get('/get-patients/:guardianId', authWithRole(['guardian']), async (req, res) => {
  const { guardianId } = req.params;
  if (req.user.uid !== guardianId) return res.status(403).json({ error: '본인만 조회 가능' });
  try {
    const doc = await db.collection('guardians').doc(guardianId).get();
    const linkedPatients = doc.data().linkedPatients || [];
    const patientDocs = await Promise.all(
      linkedPatients.map(id => db.collection('patients').doc(id).get())
    );
    const patients = patientDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
