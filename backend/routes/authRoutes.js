import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signupSchema, loginSchema } from '../utils/validators.js';

const router = Router();

// POST /api/signup
router.post('/signup', asyncHandler(async (req, res) => {
  const { value, error } = signupSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { username, password } = value;
  const normalizedUsername = username.toLowerCase();

  const snap = await db.collection('users')
    .where('normalizedUsername', '==', normalizedUsername)
    .limit(1).get();
  if (!snap.empty) return res.status(409).json({ error: 'Username is already taken' });

  const passwordHash = await bcrypt.hash(password, 10);
  const docRef = await db.collection('users').add({
    username,
    normalizedUsername,
    passwordHash,
    role: 'user',
    createdAt: new Date(),
  });
  res.status(201).json({ id: docRef.id, username, role: 'user' });
}));

// POST /api/login
router.post('/login', asyncHandler(async (req, res) => {
  const { value, error } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { username, password } = value;
  const normalizedUsername = username.toLowerCase();

  const snap = await db.collection('users')
    .where('normalizedUsername', '==', normalizedUsername)
    .limit(1).get();

  if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });

  const doc = snap.docs[0];
  const user = doc.data();
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = jwt.sign(
    { uid: doc.id, username: user.username, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, uid: doc.id, username: user.username, role: user.role || 'user' });
}));

// ✅ NEW: GET /api/users
router.get('/users', asyncHandler(async (_req, res) => {
  const snap = await db.collection('users').get();
  const items = snap.docs.map(d => ({
    id: d.id,
    username: d.data().username,
    role: d.data().role || 'user',
    createdAt: d.data().createdAt,
  }));
  res.json({ items });
}));

export default router;