import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './config/firebase.js';
import { db } from './config/firebase.js'; // ✅ เพิ่ม
import api from './routes/index.js';

const app = express();
app.use(cors());
app.use(express.json());
app.set('json spaces', 2);

// health
app.get('/', (_req, res) => res.json({ ok: true }));

// API routes
app.use('/api', api);

// 404 JSON
app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal error' });
});


// ✅================= AUTO UPDATE STATUS ===================
function isToiletOpen(openTime, closeTime) {
  if (!openTime || !closeTime) return true;
  const now = new Date();
  now.setHours(now.getHours() + 7); // 🇹🇭 ปรับเวลาเป็นเวลาไทย (GMT+7)
  const hhmm = now.toTimeString().slice(0, 5);
  return hhmm >= openTime && hhmm <= closeTime;
}

setInterval(async () => {
  try {
    const toiletsSnap = await db.collection('toilets').get();
    const now = new Date();
    now.setHours(now.getHours() + 7); // 🇹🇭 ปรับเวลาไทยตรงนี้ด้วย
    const hhmm = now.toTimeString().slice(0, 5);

    for (const doc of toiletsSnap.docs) {
      const toilet = doc.data();
      const open = isToiletOpen(toilet.open_time, toilet.close_time);
      const newStatus = open ? 'open' : 'closed';

      if (toilet.status !== newStatus) {
        await doc.ref.update({
          status: newStatus,
          statusUpdatedAt: new Date(),
        });
        console.log(`🕒 ${toilet.toilet_name} → ${newStatus}`);
      }
    }
  } catch (err) {
    console.error('⚠️ Auto-update error:', err.message);
  }
}, 60000); // ตรวจทุก 1 นาที
// ✅=========================================================


const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
