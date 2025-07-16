const express = require('express');
const router = express.Router();
const { admin, db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

// 환자 Geofence 이탈 알림 - POST /geofencealert
router.post('/', authWithRole(['patient']), async (req, res) => {
  const patient_uid = req.user.uid;

  try {
    const patientSnap = await db.collection('patients').doc(patient_uid).get();
    if (!patientSnap.exists) return res.status(404).send("환자 정보 없음");

    const patientData = patientSnap.data();
    const guardian_uid = patientData.guardian_uid;
    const patient_name = patientData.name || "환자";

    const guardianSnap = await db.collection('guardians').doc(guardian_uid).get();
    if (!guardianSnap.exists) return res.status(404).send("보호자 정보 없음");

    const fcm_tokens = guardianSnap.data()?.fcm_tokens || [];
    if (fcm_tokens.length === 0) return res.status(404).send("푸시 토큰 없음");

    const message = {
      notification: {
        title: "긴급 위치 이탈 알림",
        body: `${patient_name} 님이 안전구역을 벗어났습니다.`,
      },
    };

    const responses = await Promise.allSettled(
      fcm_tokens.map(token => admin.messaging().send({ ...message, token }))
    );

    console.log("푸시 알림 전송 결과:", responses);
    res.send({ success: true });

  } catch (err) {
    console.error("FCM 오류:", err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
