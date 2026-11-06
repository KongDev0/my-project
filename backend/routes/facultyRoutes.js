import { Router } from 'express';
import { db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { facultySchema } from '../utils/validators.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

// GET /api/faculties
router.get('/faculties', asyncHandler(async (_req, res) => {
  const snap = await db.collection('faculties').get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ items });
}));

// POST /api/faculties
router.post('/faculties', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { value, error } = facultySchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });
  const name = value.name.trim();
  const normalizedName = name.toLowerCase();

  const dup = await db.collection('faculties')
    .where('normalizedName', '==', normalizedName)
    .limit(1).get();
  if (!dup.empty) return res.status(409).json({ error: 'Faculty already exists' });

  const docRef = await db.collection('faculties').add({
    name,
    normalizedName,
    createdAt: new Date(),
    createdBy: req.user.uid,
  });
  res.status(201).json({ id: docRef.id, name });
}));

export default router;
