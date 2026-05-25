import { Router } from "express";
import { conversationController } from "../controllers/index.js";

const router = Router();

router.get("/", conversationController.getAll);
router.get("/:id", conversationController.getById);
router.post("/", conversationController.create);
router.put("/:id", conversationController.update);
router.delete("/:id", conversationController.remove);

export default router;
