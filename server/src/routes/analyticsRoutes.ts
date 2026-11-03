import { Router } from "express";
import { AnalyticsController } from "../controllers/analyticsController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/activity", AnalyticsController.getActivity);
router.get("/summary", AnalyticsController.getSummary);

export default router;
