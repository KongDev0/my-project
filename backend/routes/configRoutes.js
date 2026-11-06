// backend/routes/configRoutes.js
import express from "express";
const router = express.Router();

router.get("/config", (req, res) => {
  res.json({ GOOGLE_API_KEY: process.env.GOOGLE_API_KEY });
});

export default router;
