import { Router } from "express";
import { chatHistoryController } from "../controllers/index.js";

const router = Router();

router.get("/", chatHistoryController.getAll);
router.get("/conversation/:conversationId", chatHistoryController.getByConversationId);
router.get("/:id", chatHistoryController.getById);
router.post("/", chatHistoryController.create);
router.put("/:id", chatHistoryController.update);
router.delete("/:id", chatHistoryController.remove);

export default router;
