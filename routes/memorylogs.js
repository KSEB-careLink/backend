/*"최근 회상 보기" 같은 UI에 바로 연결 가능
GET /memory-logs/:patientId로 해당 환자의 회상 기록 전체 조회
인증은 보호자 또는 환자 본인만 가능
created_at 기준 최신순으로 정렬 */

const express = require('express');
const router = express.Router();
const { db, admin } = require('../firebase');
const authWithRole = require('../middlewares/authWithRole');

// 최근 3개월 내 회상 기록 최대 100개 조회
router.get('/:patientId', authWithRole(['guardian', 'patient']), async (req, res) => {
  const { patientId } = req.params;
  const requesterUid = req.user.uid;

  try {
    const patientDoc = await db.collection('patients').doc(patientId).get();
    if (!patientDoc.exists) {
      return res.status(404).json({ error: '환자 정보가 없습니다.' });
    }

    const guardianUid = patientDoc.data().guardian_uid;
    const isAuthorized =
      req.user.role === 'guardian' && guardianUid === requesterUid ||
      req.user.role === 'patient' && patientId === requesterUid;

    if (!isAuthorized) {
      return res.status(403).json({ error: '조회 권한이 없습니다.' });
    }

    // 🔍 최근 3개월 기준 계산
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const snapshot = await db.collection('patients')
      .doc(patientId)
      .collection('memory_logs')
      .where('created_at', '>=', admin.firestore.Timestamp.fromDate(threeMonthsAgo))
      .orderBy('created_at', 'desc')
      .limit(100)
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ logs });

  } catch (err) {
    console.error('[memory_logs 조회 오류]', err);
    res.status(500).json({ error: '조회 중 서버 오류', detail: err.message });
  }
});

module.exports = router;
