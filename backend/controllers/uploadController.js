// controllers/uploadController.js
import admin from "../config/firebase.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const storage = multer.memoryStorage();
export const upload = multer({ storage }).single("image");

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const bucket = admin.storage().bucket(process.env.FIREBASE_STORAGE_BUCKET);
    const fileName = `toilets/${uuidv4()}_${req.file.originalname}`;
    const file = bucket.file(fileName);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/${process.env.FIREBASE_STORAGE_BUCKET}/${fileName}`;

    // 🔹 บันทึก URL ลง Firestore
    const db = admin.firestore();
    await db.collection("toilets").add({
      name: req.body.name || "Untitled Toilet",
      image_url: publicUrl,
      createdAt: new Date(),
    });

    res.status(200).json({
      message: "✅ Upload success!",
      imageUrl: publicUrl,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};
