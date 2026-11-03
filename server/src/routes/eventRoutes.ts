import { Router } from "express";
import { EventController, createEventSchema, updateEventSchema } from "../controllers/eventController";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", EventController.listEvents);
router.post("/", validateBody(createEventSchema), EventController.createEvent);
router.get("/:id", EventController.getEvent);
router.patch("/:id", validateBody(updateEventSchema), EventController.updateEvent);
router.delete("/:id", EventController.deleteEvent);

export default router;
