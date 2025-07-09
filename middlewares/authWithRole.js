const admin = require('firebase-admin');
const { db } = require('../firebase');

/**
 * Firebase 토큰 검증 + Firestore에서 사용자 역할 확인
 * @param {Array} allowedRoles - 허용된 역할 배열 (예: ['guardian'])
 */
const authWithRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization 헤더가 필요합니다.' });
    }

    const idToken = authHeader.split(' ')[1];

    try {
      // 1. Firebase 토큰 검증
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // 2. Firestore에서 사용자 역할 가져오기
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) return res.status(404).json({ error: '사용자 정보 없음' });

      const role = userDoc.data().role;
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ error: `허용되지 않은 역할: ${role}` });
      }

      // 요청 객체에 사용자 정보 저장
      req.user = {
        uid,
        email: decodedToken.email,
        role,
        ...userDoc.data()
      };

      next();
    } catch (err) {
      console.error('[authWithRole] 오류:', err.message);
      return res.status(403).json({ error: '토큰 검증 실패 또는 권한 없음' });
    }
  };
};

module.exports = authWithRole;
