require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = process.env.FIREBASE_CREDENTIAL_PATH;
const storageBucket = process.env.FIREBASE_BUCKET;

if (!serviceAccountPath || !storageBucket) {
  throw new Error(".env에 FIREBASE_CREDENTIAL_PATH 또는 FIREBASE_BUCKET 누락됨");
}

const serviceAccount = require(path.resolve(serviceAccountPath));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: storageBucket
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };
