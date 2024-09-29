import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import ChatRoomSelection from "./components/ChatRoomSelection";
import ChatRoom from "./components/ChatRoom";

function App() {
  const [username, setUsername] = useState(
    localStorage.getItem("username") ? localStorage.getItem("username") : ""
  );

  // save username in localStorage
  useEffect(() => {
    localStorage.setItem("username", username);
  }, [username]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route
            path="/"
            element={
              <ChatRoomSelection
                username={username}
                setUsername={setUsername}
              />
            }
          />
          <Route
            path="/chat/:room"
            element={<ChatRoom username={username} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
