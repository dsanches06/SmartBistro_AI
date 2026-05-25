import { Router } from "express";
import * as chatHistoryController from "../controllers/chatHistoryController.js";

const router = Router();

router.get("/", chatHistoryController.getAll);
router.get("/conversation/:conversationId", chatHistoryController.getByConversationId);
router.get("/:id", chatHistoryController.getById);
router.post("/", chatHistoryController.create);
router.put("/:id", chatHistoryController.update);
router.delete("/:id", chatHistoryController.remove);

export default router;
