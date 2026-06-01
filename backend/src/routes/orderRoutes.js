import { Router } from "express";
import { orderController, orderPipelineController } from "../controllers/index.js";
import { checkOrderExists } from "../middlewares/index.js";

const router = Router();

router.post("/pipeline", orderPipelineController.processOrderPipeline);

router.get("/",                    orderController.getAll);
router.get("/pending",             orderController.getPending);
router.get("/customer/:customerId",orderController.getByCustomerId);
router.post("/",                   orderController.create);

router.get("/:id",         checkOrderExists, orderController.getById);
router.put("/:id",         checkOrderExists, orderController.update);
router.patch("/:id/status",checkOrderExists, orderController.updateStatus);
router.delete("/:id",      checkOrderExists, orderController.remove);

export default router;
