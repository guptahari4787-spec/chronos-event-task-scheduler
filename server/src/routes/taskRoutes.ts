import { Router } from "express";
import { TaskController, createTaskSchema, updateTaskSchema } from "../controllers/taskController";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", TaskController.listTasks);
router.post("/", validateBody(createTaskSchema), TaskController.createTask);
router.get("/:id", TaskController.getTask);
router.patch("/:id", validateBody(updateTaskSchema), TaskController.updateTask);
router.delete("/:id", TaskController.deleteTask);

router.post("/:id/dependencies", TaskController.addDependency);
router.delete("/:id/dependencies/:dependencyId", TaskController.removeDependency);

export default router;
