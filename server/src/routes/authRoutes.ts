import { Router } from "express";
import { AuthController, registerSchema, loginSchema } from "../controllers/authController";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/register", validateBody(registerSchema), AuthController.register);
router.post("/login", validateBody(loginSchema), AuthController.login);
router.get("/me", requireAuth, AuthController.me);
router.patch("/preferences", requireAuth, AuthController.updatePreferences);
router.post("/logout", AuthController.logout);

export default router;
