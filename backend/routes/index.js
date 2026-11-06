import { Router } from 'express';
import authRoutes from './authRoutes.js';
import facultyRoutes from './facultyRoutes.js';
import buildingRoutes from './buildingRoutes.js';
import toiletRoutes from './toiletRoutes.js';
import reportRoutes from './reportRoutes.js';
// import dashboardRoutes from './dashboardRoutes.js';

const router = Router();

// ตัวอย่าง logger สั้น ๆ (ช่วยดีบัก URL)
router.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

router.use(authRoutes);
router.use(facultyRoutes);
router.use(buildingRoutes);
router.use(toiletRoutes);
router.use(reportRoutes);
// router.use(dashboardRoutes);

export default router;
