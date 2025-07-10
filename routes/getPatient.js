const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

router.get('/:guardianId', authWithRole(['guardian']), async (req, res) => {
  const { guardianId } = req.params;
  const callerUid = req.user.uid;

  if (callerUid !== guardianId) {
    return res.status(403).json({ error: '본인의 데이터만 조회할 수 있습니다.' });
  }

  try {
    const doc = await db.collection('users').doc(guardianId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: '보호자 정보가 없습니다.' });
    }

    const linkedPatients = doc.data().linkedPatients || [];

    const patientDocs = await Promise.all(
      linkedPatients.map(id => db.collection('users').doc(id).get())
    );

    const patients = patientDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
