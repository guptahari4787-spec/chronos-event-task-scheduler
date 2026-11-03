import { Router } from "express";
import { CalendarController } from "../controllers/calendarController";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", CalendarController.getFeed);
router.get("/free-slots", CalendarController.getFreeSlots);

export default router;
