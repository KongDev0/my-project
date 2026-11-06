import { Router } from "express";
import { db } from "../config/firebase.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toiletSchema, idSchema } from "../utils/validators.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import admin from "../config/firebase.js";

const router = Router();

// ✅ ย้ายขึ้นมาที่นี่ (ก่อนทุก route)
const upload = multer({ storage: multer.memoryStorage() });

/**
 * ✅ ตรวจว่าอยู่ในช่วงเวลาเปิดไหม (รองรับข้ามวัน + เวลาไทย)
 */
function isToiletOpen(openTime, closeTime) {
  if (!openTime || !closeTime) return true;
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
  const current = formatter.format(now);
  if (closeTime < openTime) return current >= openTime || current <= closeTime;
  return current >= openTime && current <= closeTime;
}

/**
 * ✅ อัปเดตสถานะจริงใน Firestore
 */
async function updateRealtimeStatus(toiletId, open) {
  try {
    await db.collection("toilets").doc(toiletId).update({
      status: open ? "open" : "closed",
      statusUpdatedAt: new Date(),
    });
  } catch (err) {
    console.warn(`⚠️ cannot update status of ${toiletId}:`, err.message);
  }
}

/**
 * ✅ คำนวณสถานะจริงโดยดู manualStatus ก่อนเวลา
 */
function attachStatus(toilet) {
  let open = true;
  if (toilet.manualStatus === "closed") open = false;
  else if (toilet.manualStatus === "open") open = true;
  else open = isToiletOpen(toilet.open_time, toilet.close_time);
  const updated = { ...toilet, status: open ? "open" : "closed" };
  updateRealtimeStatus(toilet.id, open);
  return updated;
}

/**
 * ✅ GET toilets by building_id
 */
router.get(
  "/toilets",
  asyncHandler(async (req, res) => {
    const buildingId = (req.query.building_id || "").trim();
    const { error } = idSchema.validate(buildingId);
    if (error)
      return res.status(400).json({ error: "building_id required or invalid format" });

    const snap = await db
      .collection("toilets")
      .where("building_id", "==", buildingId)
      .get();

    const items = snap.docs.map((d) => attachStatus({ id: d.id, ...d.data() }));

    const authHeader = req.headers.authorization || "";
    const isAdmin = !!authHeader;

    const visibleItems = isAdmin
      ? items
      : items.filter((t) => t.status === "open");

    res.json({ items: visibleItems });
  })
);

/**
 * ✅ GET single toilet by ID
 */
router.get(
  "/toilets/:id",
  asyncHandler(async (req, res) => {
    const { error } = idSchema.validate(req.params.id);
    if (error) return res.status(400).json({ error: "Invalid id" });

    const doc = await db.collection("toilets").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    const toilet = attachStatus({ id: doc.id, ...doc.data() });
    res.json(toilet);
  })
);

/**
 * ✅ POST create toilet (admin)
 */
router.post(
  "/toilets",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { value, error } = toiletSchema.validate(req.body, {
      stripUnknown: true,
    });
    if (error) return res.status(400).json({ error: error.message });

    const { building_id } = value;
    const bDoc = await db.collection("buildings").doc(building_id).get();
    if (!bDoc.exists)
      return res.status(400).json({ error: "Invalid building_id" });

    const docRef = await db.collection("toilets").add({
      ...value,
      amenities: value.amenities ?? [],
      latitude: value.latitude ?? null,
      longitude: value.longitude ?? null,
      createdAt: new Date(),
      createdBy: req.user.uid,
      status: "open",
      manualStatus: "auto",
    });

    res.status(201).json({ id: docRef.id });
  })
);

/**
 * ✅ PATCH update toilet (admin)
 *    รองรับการอัปโหลดรูปใหม่ขึ้น Cloud
 */
router.patch(
  "/toilets/:id",
  requireAuth,
  requireAdmin,
  upload.single("image"), // ✅ ใช้งานได้แล้ว
  asyncHandler(async (req, res) => {
    const { error } = idSchema.validate(req.params.id);
    if (error) return res.status(400).json({ error: "Invalid id" });

    const ref = db.collection("toilets").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    let imageUrl = doc.data().image_url;

    // ✅ ถ้ามีไฟล์ใหม่ ให้อัปขึ้น Cloud
    if (req.file) {
      const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
      const fileName = `toilets/${uuidv4()}_${req.file.originalname}`;
      const file = bucket.file(fileName);
      await file.save(req.file.buffer, {
        metadata: { contentType: req.file.mimetype },
        public: true,
      });
      imageUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`;
    }

    const merged = { ...doc.data(), ...req.body, image_url: imageUrl };

    await ref.update({
      ...merged,
      updatedAt: new Date(),
      updatedBy: req.user.uid,
    });

    res.json({ ok: true, image_url: imageUrl });
  })
);

/**
 * ✅ DELETE toilet (admin)
 */
router.delete(
  "/toilets/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { error } = idSchema.validate(req.params.id);
    if (error) return res.status(400).json({ error: "Invalid id" });

    const ref = db.collection("toilets").doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });

    await ref.delete();
    res.json({ ok: true });
  })
);

/**
 * ✅ GET all toilets (for user nearby search)
 */
router.get(
  "/all-toilets",
  asyncHandler(async (_req, res) => {
    const snap = await db.collection("toilets").get();
    const items = snap.docs.map((d) => attachStatus({ id: d.id, ...d.data() }));
    res.json({ items });
  })
);

/**
 * ✅ POST /toilets/upload (อัปโหลดรูปอย่างเดียว)
 */
router.post(
  "/toilets/upload",
  requireAuth,
  requireAdmin,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file)
      return res.status(400).json({ error: "No image file uploaded" });

    const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const fileName = `toilets/${uuidv4()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`;

    res.status(200).json({
      message: "✅ Image uploaded successfully",
      imageUrl: publicUrl,
    });
  })
);

export default router;
