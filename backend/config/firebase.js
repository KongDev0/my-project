import admin from 'firebase-admin';

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
  .replace(/^"|"$/g, '')
  .replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

export const db = admin.firestore();
export default admin;
