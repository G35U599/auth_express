import express from "express";
import "dotenv/config";
import { connectRedis } from "./config/redis";
import authRoutes from "./modules/auth/auth.routes";

const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectRedis();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Error iniciando el servidor:", error);
    process.exit(1);
  }
};

startServer();
