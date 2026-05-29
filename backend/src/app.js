import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./middlewares/loggerMiddleware.js";
import {
  customerRoutes,
  roleRoutes,
  tableRoutes,
  itemRoutes,
  ingredientRoutes,
  stockRoutes,
  recipeItemRoutes,
  orderRoutes,
  orderItemRoutes,
  invoiceRoutes,
  paymentRoutes,
  notificationRoutes,
  conversationRoutes,
  chatHistoryRoutes,
  chatRoutes,
  logRoutes,
} from "./routes/index.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(logger);

/* Health check */
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "SERVER API is running",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000,
  });
});

/* Routes */
app.use("/customers", customerRoutes);
app.use("/roles", roleRoutes);
app.use("/tables", tableRoutes);
app.use("/items", itemRoutes);
app.use("/ingredients", ingredientRoutes);
app.use("/stock", stockRoutes);
app.use("/recipe-items", recipeItemRoutes);
app.use("/orders", orderRoutes);
app.use("/order-items", orderItemRoutes);
app.use("/invoices", invoiceRoutes);
app.use("/payments", paymentRoutes);
app.use("/notifications", notificationRoutes);
app.use("/conversations", conversationRoutes);
app.use("/chat-history", chatHistoryRoutes);
app.use("/chat", chatRoutes);
app.use("/logs", logRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SERVER API em http://localhost:${PORT}`);
});

export default app;
