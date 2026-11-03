import { Router } from "express";
import { SchedulerController } from "../controllers/schedulerController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/recommendations", SchedulerController.getRecommendations);
router.post("/plan-my-day", SchedulerController.planMyDay);
router.get("/plan-my-day", SchedulerController.planMyDay);
router.get("/impact/:taskId", SchedulerController.evaluateImpact);

export default router;
