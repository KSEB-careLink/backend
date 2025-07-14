const cron = require('node-cron');
const { db, admin } = require('../firebase');

// 매분 실행
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}`; // 예: "07:30"

  try {
    const snapshot = await db.collection('alarmItems')
      .where('time', '==', currentTime)
      .get();

    const alarmsToSend = snapshot.docs.map(doc => doc.data());

    for (const alarm of alarmsToSend) {
      const userDoc = await db.collection('users').doc(alarm.patientId).get();
      const token = userDoc.data()?.fcmToken;

      if (token) {
        await admin.messaging().send({
          token,
          notification: {
            title: 'CareLink 알림',
            body: alarm.message
          }
        });
        console.log(`[알림 전송 완료] ${alarm.message} → ${alarm.patientId}`);
      }
    }
  } catch (err) {
    console.error('정기 알림 전송 실패:', err.message);
  }
});