// middlewares/authWithRole.js
const { admin, db } = require('../firebase');

const authWithRole = (allowedRoles = []) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization 헤더가 필요합니다.' });
  }
  const idToken = authHeader.split(' ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: '사용자 정보 없음' });
    const role = userDoc.data().role;
    if (!allowedRoles.includes(role)) return res.status(403).json({ error: '권한 없음' });
    req.user = { uid, role, ...userDoc.data() };
    next();
  } catch (err) {
    res.status(403).json({ error: '토큰 검증 실패' });
  }
};

module.exports = authWithRole;
