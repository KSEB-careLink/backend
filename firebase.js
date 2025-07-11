require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(process.env.FIREBASE_CREDENTIAL_PATH));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
