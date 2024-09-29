import React from "react";
import { Link } from "react-router-dom";

function ChatRoomSelection({ username, setUsername }) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Chat Room Selection
        </h1>
        <input
          type="text"
          placeholder="Enter your display name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        <div className="space-y-2">
          <Link
            to="/chat/chatroom1"
            className="block w-full text-center bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition"
          >
            Join Chat Room 1
          </Link>
          <Link
            to="/chat/chatroom2"
            className="block w-full text-center bg-green-500 text-white p-2 rounded hover:bg-green-600 transition"
          >
            Join Chat Room 2
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ChatRoomSelection;
