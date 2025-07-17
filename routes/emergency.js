const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

router.post('/', authWithRole(['patient']), async (req, res) => {
  const { guardianId, message = '환자로부터 긴급 알림이 도착했습니다.' } = req.body;
  const { uid: patientId } = req.user;

  try {
    // 보호자 문서 조회
    const guardianDoc = await db.collection('guardians').doc(guardianId).get();
    if (!guardianDoc.exists) {
      return res.status(404).json({ error: '보호자 정보를 찾을 수 없습니다.' });
    }

    const fcmToken = guardianDoc.data().fcmToken;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return res.status(400).json({ error: '보호자의 FCM 토큰이 유효하지 않습니다.' });
    }

    // FCM 메시지 전송
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'CareLink 긴급 알림',
          body: message,
        },
        data: {
          type: 'emergency',
          patientId,
          timestamp: Date.now().toString(),
        }
      });

      // (선택) 긴급 요청 로그 저장
      /*
      await db.collection('patients').doc(patientId)
        .collection('emergency_logs')
        .add({
          guardianId,
          message,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      */

      return res.json({ success: true });

    } catch (sendError) {
      console.error('[FCM 전송 오류]', sendError);
      return res.status(500).json({ error: 'FCM 전송 실패', details: sendError.message });
    }

  } catch (error) {
    console.error('[긴급알림 서버 오류]', error);
    return res.status(500).json({ error: '서버 내부 오류' });
  }
});

module.exports = router;
