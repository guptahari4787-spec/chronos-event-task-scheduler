import { Router } from "express";
import { CategoryController, categorySchema } from "../controllers/categoryController";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/", CategoryController.listCategories);
router.post("/", validateBody(categorySchema), CategoryController.createCategory);
router.delete("/:id", CategoryController.deleteCategory);

export default router;
