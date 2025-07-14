require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "carelink-a228a.firebasestorage.app"
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket()

module.exports = { admin, db, bucket };