import { io } from "socket.io-client";

let socket;

/**
 * Connects the Socket.io client to the backend server.
 * @param {string} token - JWT token for authentication.
 * @returns {Socket} - The connected socket instance.
 */
export function connectSocket(token) {
  if (socket && socket.connected) return socket;

  const serverURL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

  socket = io(serverURL, {
    auth: { token },
    transports: ["websocket"], // ensures real-time
    reconnectionAttempts: 5, // retry 5 times if connection fails
    reconnectionDelay: 2000, // 2s between attempts
    autoConnect: true,
  });

  // ---- Connection Events ----
  socket.on("connect", () => {
    console.log("✅ Connected to server:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("⚠️ Disconnected from server:", reason);
    if (reason === "io server disconnect") {
      // If server manually disconnects, try to reconnect
      socket.connect();
    }
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log(`🔄 Attempting to reconnect... (${attempt})`);
  });

  socket.on("reconnect_failed", () => {
    console.error("❌ Reconnection failed after multiple attempts.");
  });

  socket.on("connect_error", (err) => {
    console.error("🚫 Socket connection error:", err.message);
  });

  // Optional: auto-refresh auth token if changed
  socket.on("unauthorized", () => {
    console.error("🚫 Invalid or expired token — please log in again.");
    socket.disconnect();
  });

  return socket;
}

/**
 * Returns the existing socket instance (if connected).
 * @returns {Socket|undefined} - The socket instance or undefined if not connected.
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnects and cleans up the socket connection.
 */
export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    console.log("🔌 Socket connection closed.");
  }
}

  
