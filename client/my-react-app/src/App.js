import React from "react";
import ChatRoom from "./pages/ChatRoom";

import "./App.css";

function App() {
  const token = localStorage.getItem("token") || "demo-token";
  const roomId = "general";

  return (
    <div className="App">
      <header className="App-header">
        <h1>💬 Real-Time Chat Room</h1>
      </header>
      <main className="App-main">
        <ChatRoom token={token} roomId={roomId} />
      </main>
    </div>
  );
}

export default App;