const express = require('express');
const router = express.Router();
const { db } = require('../firebase');

router.get('/:guardianId', async (req, res) => {
  const { guardianId } = req.params;

  try {
    const doc = await db.collection('users').doc(guardianId).get();
    const linkedPatients = doc.data().linkedPatients || [];

    const patientDocs = await Promise.all(
      linkedPatients.map(id => db.collection('users').doc(id).get())
    );

    const patients = patientDocs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ patients });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
