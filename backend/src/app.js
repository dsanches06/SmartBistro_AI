import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import logger from "./middlewares/loggerMiddleware.js"

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors({ origin: "*" }));
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`SERVER API em http://localhost:${PORT}`);
});

export default app;
