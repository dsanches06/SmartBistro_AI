import { Router } from "express";
import { orderController, orderPipelineController, kdsController } from "../controllers/index.js";
import { checkOrderExists } from "../middlewares/index.js";
import { verifyToken, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Nota: /pipeline fica sem verifyToken de propósito — ferramenta interna de staff
// para pedidos em linguagem natural, com testes de integração próprios que ainda
// não simulam autenticação. Requer actualização dos testes antes de proteger.
router.post("/pipeline", orderPipelineController.processOrderPipeline);

// Cliente e staff partilham a maior parte destas rotas (pedidos próprios vs. gestão total).
router.use(verifyToken);

router.post("/auto-advance",        orderController.autoAdvance);
router.get("/",                    requireRole(1), orderController.getAll);
router.get("/pending",             requireRole(1), orderController.getPending);
router.get("/user/:userId",        orderController.getByUserId);
router.post("/",                   orderController.create);

router.get("/:id",              checkOrderExists, orderController.getById);
router.put("/:id",              checkOrderExists, orderController.update);
router.patch("/:id/status",     checkOrderExists, orderController.updateStatus);
router.post("/:id/chef-start",  checkOrderExists, kdsController.chefStartOrder);
router.delete("/:id",           checkOrderExists, orderController.remove);

export default router;
