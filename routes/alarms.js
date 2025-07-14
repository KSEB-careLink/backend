const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

// [0] 알림 등록
router.post('/', authWithRole(['guardian']), async (req, res) => {
  const { patientId, message, time } = req.body;
  const guardianId = req.user.uid;

  if (!patientId || !message || !time) {
    return res.status(400).json({ error: '모든 값을 입력해주세요.' });
  }

  try {
    const docRef = await db.collection('alarmItems').add({
      guardianId,
      patientId,
      message,
      time, // 형식: "HH:mm"
      createdAt: new Date()
    });

    res.status(201).json({ message: '알림 등록 완료', alarmId: docRef.id });
  } catch (err) {
    console.error('알림 등록 실패:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});


// [1] 알림 조회
router.get('/:guardianId', authWithRole(['guardian']), async (req, res) => {
  const { guardianId } = req.params;
  if (req.user.uid !== guardianId) return res.status(403).json({ error: '본인만 조회 가능' });

  try {
    const snapshot = await db.collection('alarmItems')
      .where('guardianId', '==', guardianId)
      .get();

    const alarms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ alarms });
  } catch (err) {
    res.status(500).json({ error: '조회 실패' });
  }
});

// [2] 알림 삭제
router.delete('/:alarmId', authWithRole(['guardian']), async (req, res) => {
  const { alarmId } = req.params;

  try {
    const docRef = db.collection('alarmItems').doc(alarmId);
    const doc = await docRef.get();

    if (!doc.exists) return res.status(404).json({ error: '알림 없음' });
    if (doc.data().guardianId !== req.user.uid) return res.status(403).json({ error: '삭제 권한 없음' });

    await docRef.delete();
    res.status(200).json({ message: '삭제 완료' });
 } catch (err) {
  console.error('알림 삭제 실패:', err);  // ✅ 콘솔에서 확인 가능
  res.status(500).json({ error: '삭제 실패', detail: err.message });  // ✅ 클라이언트에도 원인 전달
}

});

module.exports = router;
