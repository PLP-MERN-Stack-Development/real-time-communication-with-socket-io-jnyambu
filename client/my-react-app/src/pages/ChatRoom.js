import React, { useEffect, useState, useRef } from "react";
import { connectSocket } from "../socket/socket.js";

export default function ChatRoom({ token, roomId = "general" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typingUsers, setTypingUsers] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);
    socketRef.current = socket;

    socket.on("connect", () => console.log("✅ Connected:", socket.id));

    // Join chat room
    socket.emit("room:join", { roomId });

    // Load chat history
    socket.on("room:history", (history) => setMessages(history));

    // New message received
    socket.on("message:new", (msg) => setMessages((prev) => [...prev, msg]));

    // Typing indicators
    socket.on("userTyping", (user) => {
      setTypingUsers((prev) => ({ ...prev, [user.userId]: user.username }));
    });
    socket.on("userStoppedTyping", (user) => {
      setTypingUsers((prev) => {
        const copy = { ...prev };
        delete copy[user.userId];
        return copy;
      });
    });

    // Read receipts
    socket.on("messageReadBy", ({ messageId, reader }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, readBy: [...(m.readBy || []), reader.username] }
            : m
        )
      );
    });

    // Notifications
    socket.on("newNotification", (notification) =>
      setNotifications((prev) => [notification, ...prev])
    );

    // Presence updates
    socket.on("presence:update", ({ userId, username, status }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: { username, status },
      }));
    });

    return () => {
      socket.emit("room:leave", { roomId });
      socket.disconnect();
    };
  }, [token, roomId]);

  // Send a message
  const handleSend = () => {
    const socket = socketRef.current;
    if (!input.trim()) return;
    socket.emit("message:send", { roomId, content: input });
    setInput("");
  };

  // Typing start/stop
  const handleTyping = (e) => {
    const socket = socketRef.current;
    setInput(e.target.value);
    socket.emit("typing", roomId);
    clearTimeout(socket.typingTimeout);
    socket.typingTimeout = setTimeout(() => {
      socket.emit("stopTyping", roomId);
    }, 2000);
  };

  // Mark messages as read
  const handleMarkRead = (messageId) => {
    const socket = socketRef.current;
    socket.emit("message:read", { roomId, messageId });
  };

  return (
    <div className="flex flex-col p-4 max-w-2xl mx-auto bg-white shadow-lg rounded-xl">
      <h2 className="text-2xl font-bold mb-2">💬 Room: {roomId}</h2>

      {/* Online users */}
      <div className="text-sm text-gray-600 mb-3">
        <strong>Online:</strong>{" "}
        {Object.values(onlineUsers)
          .filter((u) => u.status === "online")
          .map((u) => u.username)
          .join(", ") || "No one online"}
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <strong>🔔 Notifications:</strong>
          <ul className="list-disc pl-5 text-sm">
            {notifications.slice(0, 3).map((n, idx) => (
              <li key={idx}>
                {n.from}: {n.notification}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto border rounded-lg p-3 mb-2 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className="mb-2 cursor-pointer"
            onClick={() => handleMarkRead(msg._id)}
          >
            <strong>{msg.sender?.username || "Anon"}:</strong> {msg.content}
            {msg.readBy?.length > 0 && (
              <span className="text-xs text-green-600 ml-2">
                ✓ Read by {msg.readBy.join(", ")}
              </span>
            )}
          </div>
        ))}
        {Object.values(typingUsers).length > 0 && (
          <p className="text-gray-500 italic text-sm">
            {Object.values(typingUsers).join(", ")} typing...
          </p>
        )}
      </div>

      {/* Input box */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={handleTyping}
          placeholder="Type a message..."
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
