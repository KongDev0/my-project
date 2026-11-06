//toiletController.js
import { db } from '../config/firebase.js';
import { toiletSchema, idSchema } from '../utils/validators.js';

export const getToiletById = async (req, res) => {
  try {
    const { error } = idSchema.validate(req.params.id);
    if (error) return res.status(400).json({ error: 'Invalid id' });

    const doc = await db.collection('toilets').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Toilet not found' });

    const data = doc.data();
    res.json({
      id: doc.id,
      toilet_name: data.toilet_name,
      toilet_type: data.toilet_type || 'unisex',
      status: data.status || 'open',
      male_rooms: data.male_rooms ?? 0,
      female_rooms: data.female_rooms ?? 0,
      disabled_rooms: data.disabled_rooms ?? 0,
      sinks: data.sinks ?? 0,
      urinals: data.urinals ?? 0,          // ✅ เพิ่ม
      prayer_room: !!data.prayer_room,     // ✅ เพิ่ม

      open_time: data.open_time || '00:00',
      close_time: data.close_time || '24:00',
      days: Array.isArray(data.days) ? data.days : [],
      description: data.description || '',
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};
