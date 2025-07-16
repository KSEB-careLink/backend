const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

// 보호자 FCM 등록 - POST /geofencefcm/register
router.post('/register', authWithRole(['guardian']), async (req, res) => {
  const { fcm_token } = req.body;
  const guardian_uid = req.user.uid;

  if (!fcm_token) return res.status(400).send("Missing fcm_token");

  try {
    await db.collection('guardians').doc(guardian_uid).set({
      fcm_tokens: admin.firestore.FieldValue.arrayUnion(fcm_token)
    }, { merge: true });

    res.send({ success: true });
  } catch (err) {
    console.error("FCM 등록 실패:", err);
    res.status(500).send("Failed to save FCM token");
  }
});

// 보호자 FCM 제거 - POST /geofencefcm/unregister
router.post('/unregister', authWithRole(['guardian']), async (req, res) => {
  const { fcm_token } = req.body;
  const guardian_uid = req.user.uid;

  if (!fcm_token) return res.status(400).send("Missing fcm_token");

  try {
    await db.collection('guardians').doc(guardian_uid).update({
      fcm_tokens: admin.firestore.FieldValue.arrayRemove(fcm_token)
    });
    res.send({ success: true });
  } catch (err) {
    console.error("FCM 토큰 제거 실패:", err);
    res.status(500).send("Failed to remove FCM token");
  }
});

module.exports = router;
