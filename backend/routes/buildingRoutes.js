import { Router } from 'express';
import { db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { buildingSchema, idSchema } from '../utils/validators.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = Router();

/**
 * ดึงรายการอาคาร 
 */
router.get('/buildings', asyncHandler(async (req, res) => {
  const facultyId = (req.query.faculty_id || '').trim();
  
  let snap;
  if (facultyId) {
    // ✅ ถ้าส่ง faculty_id มา → กรองเฉพาะตึกของคณะนั้น
    snap = await db.collection('buildings')
      .where('faculty_id', '==', facultyId)
      .get();
  } else {

    snap = await db.collection('buildings').get();
  }

  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ items });
}));

/**
 * ดึงข้อมูลอาคารตาม ID
 */
router.get('/buildings/:id', asyncHandler(async (req, res) => {
  const { error } = idSchema.validate(req.params.id);
  if (error) return res.status(400).json({ error: 'Invalid building id' });

  const doc = await db.collection('buildings').doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: 'Building not found' });

  res.json({ id: doc.id, ...doc.data() });
}));

/**
 * เพิ่มอาคารใหม่ 
 */
router.post('/buildings', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { error, value } = buildingSchema.validate(req.body, { abortEarly: false });
  if (error) return res.status(400).json({ error: error.details.map(e => e.message).join(', ') });

  const docRef = await db.collection('buildings').add({
    ...value,
    createdAt: new Date(),
    createdBy: req.user.uid,
  });

  res.status(201).json({ id: docRef.id, ...value });
}));

/**
 
 * แก้ไขข้อมูลอาคาร (Admin เท่านั้น)
 */
router.patch('/buildings/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { error } = idSchema.validate(req.params.id);
  if (error) return res.status(400).json({ error: 'Invalid building id' });

  const updates = {};
  if (typeof req.body.building_name === 'string') updates.building_name = req.body.building_name.trim();
  if (typeof req.body.floor === 'number') updates.floor = req.body.floor;
  if (typeof req.body.faculty_id === 'string') updates.faculty_id = req.body.faculty_id.trim();

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No updatable fields' });
  }

  const ref = db.collection('buildings').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Building not found' });

  await ref.update({ ...updates, updatedAt: new Date(), updatedBy: req.user.uid });

  res.json({ ok: true, updates });
}));

/**
 * ลบอาคาร 
 */
router.delete('/buildings/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { error } = idSchema.validate(req.params.id);
  if (error) return res.status(400).json({ error: 'Invalid building id' });

  const ref = db.collection('buildings').doc(req.params.id);
  const doc = await ref.get();
  if (!doc.exists) return res.status(404).json({ error: 'Building not found' });

  await ref.delete();
  res.json({ ok: true });
}));

export default router;
