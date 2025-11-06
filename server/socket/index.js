import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import Room from "../models/Room.js";

export function setupSocket(io) {
  // 🔐 Authenticate each socket connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: payload.id, username: payload.username };
      next();
    } catch (err) {
      console.error("JWT verification failed:", err.message);
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Connected: ${socket.id} (user: ${socket.user.username})`);

    // 🟢 Presence: mark user as online
    socket.join(`user:${socket.user.id}`);
    io.emit("presence:update", {
      userId: socket.user.id,
      username: socket.user.username,
      status: "online",
    });

    // 🏠 Join a chat room
    socket.on("room:join", async ({ roomId }) => {
      try {
        socket.join(`room:${roomId}`);
        io.to(`room:${roomId}`).emit("room:users", {
          roomId,
          userId: socket.user.id,
          username: socket.user.username,
          action: "joined",
        });

        // Send last 50 messages as room history
        const history = await Message.find({ room: roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate("sender", "username _id");
        socket.emit("room:history", history.reverse());
      } catch (err) {
        console.error("Room join error:", err.message);
      }
    });

    // 🚪 Leave room
    socket.on("room:leave", ({ roomId }) => {
      socket.leave(`room:${roomId}`);
      io.to(`room:${roomId}`).emit("room:users", {
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
        action: "left",
      });
    });

    // 💬 Send a message
    socket.on("message:send", async ({ roomId, content }) => {
      if (!content?.trim()) return;
      try {
        const msg = await Message.create({
          room: roomId,
          sender: socket.user.id,
          content,
          createdAt: new Date(),
        });

        const populated = await msg.populate("sender", "username _id");
        io.to(`room:${roomId}`).emit("message:new", {
          _id: populated._id,
          room: roomId,
          sender: populated.sender,
          content: populated.content,
          createdAt: populated.createdAt,
        });
      } catch (err) {
        console.error("Message send error:", err.message);
      }
    });

    // ✨ Typing indicator
    socket.on("typing", (roomId) => {
      socket.to(`room:${roomId}`).emit("userTyping", {
        userId: socket.user.id,
        username: socket.user.username,
      });
    });

    socket.on("stopTyping", (roomId) => {
      socket.to(`room:${roomId}`).emit("userStoppedTyping", {
        userId: socket.user.id,
        username: socket.user.username,
      });
    });

    // 👁️ Message read receipts
    socket.on("message:read", async ({ roomId, messageId }) => {
      try {
        io.to(`room:${roomId}`).emit("messageReadBy", {
          messageId,
          reader: {
            userId: socket.user.id,
            username: socket.user.username,
          },
        });
      } catch (err) {
        console.error("Read receipt error:", err.message);
      }
    });

    // 🔔 Real-time notifications
    socket.on("notify", ({ roomId, notification }) => {
      socket.to(`room:${roomId}`).emit("newNotification", {
        from: socket.user.username,
        notification,
        time: new Date(),
      });
    });

    // 🔴 Disconnect handling
    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.user.username}`);
      io.emit("presence:update", {
        userId: socket.user.id,
        username: socket.user.username,
        status: "offline",
      });
    });
  });
}
