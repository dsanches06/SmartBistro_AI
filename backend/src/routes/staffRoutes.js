import { Router } from "express";
import * as staffController from "../controllers/staffController.js";

const router = Router();

router.get("/",              staffController.getAll);
router.post("/",             staffController.create);
router.get("/:userId/check", staffController.check);
router.get("/:userId",       staffController.getByUserId);
router.put("/:userId",       staffController.update);
router.delete("/:userId",    staffController.remove);

export default router;
