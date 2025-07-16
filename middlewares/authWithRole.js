// middlewares/authWithRole.js
const { admin, db } = require('../firebase');

const authWithRole = (allowedRoles = []) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization 헤더가 필요합니다.' });
  }

  const idToken = authHeader.split(' ')[1];

  try {
    // Firebase 토큰 검증
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // 사용자 문서 조회
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: '사용자 정보를 찾을 수 없습니다.' });
    }

    const userData = userSnap.data();
    const userRole = userData.role;

    // 권한 확인
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    // 요청 객체에 사용자 정보 추가
    req.user = {
      uid,
      role: userRole,
      name: userData.name || null, // 필요한 것만 선택적으로 추가
    };

    return next();

  } catch (err) {
    console.error('[authWithRole 에러]', err);
    return res.status(401).json({ error: '토큰 인증 실패' });
  }
};

module.exports = authWithRole;
