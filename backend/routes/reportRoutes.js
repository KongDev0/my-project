import { Router } from 'express';
import { db } from '../config/firebase.js';
import asyncHandler from '../utils/asyncHandler.js';
import { reportSchema, idSchema } from '../utils/validators.js';

const router = Router();

// POST /api/reports  (public: ผู้ใช้แจ้งปัญหา)
router.post('/reports', asyncHandler(async (req, res) => {
  const { value, error } = reportSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  const { toilet_id, toilet_name, message } = value;

  // ตรวจสอบว่าห้องน้ำมีจริง (ถ้าต้องการ)
  const idCheck = idSchema.validate(toilet_id);
  if (idCheck.error) return res.status(400).json({ error: 'Invalid toilet_id' });

  const toiletDoc = await db.collection('toilets').doc(toilet_id).get();
  if (!toiletDoc.exists) return res.status(404).json({ error: 'Toilet not found' });

  const docRef = await db.collection('reports').add({
    toilet_id,
    toilet_name: toilet_name || toiletDoc.data()?.toilet_name || null,
    message,
    createdAt: new Date(),
    status: 'open', // open | in_progress | closed
  });

  res.status(201).json({ id: docRef.id });
}));

// (optional) GET /api/reports?toilet_id=...  สำหรับ admin dashboard
router.get('/reports', asyncHandler(async (req, res) => {
  const { toilet_id } = req.query;
  let q = db.collection('reports');
  if (toilet_id) q = q.where('toilet_id', '==', toilet_id);
  const snap = await q.orderBy('createdAt', 'desc').get();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  res.json({ items });
}));

export default router;
