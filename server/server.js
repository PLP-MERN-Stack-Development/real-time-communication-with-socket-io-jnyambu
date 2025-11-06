import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

import userRoutes from "./routes/users.js";   // REST endpoints for register/login
import { setupSocket } from "./socket/index.js"; // socket logic

dotenv.config();

const app = express();

// === Middleware ===
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

// === Routes ===
app.use("/api/users", userRoutes);

// === Create Server + Socket.io ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
});

// === Setup Socket.io ===
setupSocket(io);

// === MongoDB Connection ===
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// === Start Server ===
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

// Optional export if needed in tests or for external modules
export { io, app, server };
