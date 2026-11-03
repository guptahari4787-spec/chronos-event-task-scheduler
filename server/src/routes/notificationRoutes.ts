import { Router } from "express";
import { NotificationController } from "../controllers/notificationController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", NotificationController.listNotifications);
router.patch("/:id/read", NotificationController.markRead);
router.post("/read-all", NotificationController.markAllRead);

export default router;
