// components/ChatRoom.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

function ChatRoom({ username }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [ws, setWs] = useState(null);
  const [typing, setTyping] = useState(false);
  const [isSomeOneTyping, setIsSomeOneTyping] = useState(false);
  const { room } = useParams();
  const navigate = useNavigate();
  const chatContainerRef = useRef(null);
  const backendUrl = process.env.REACT_APP_BACKEND_URL;
  const websocketUrl = process.env.REACT_APP_WEBSOCKET_URL;
  const [userId, setUserId] = useState("");

  // Fetch previous messages when the component mounts or when rejoining the room
  const fetchPreviousMessages = () => {
    fetch(`${backendUrl}/api/messages/${room}`)
      .then((response) => response.json())
      .then((data) => {
        setMessages(data);
      })
      .catch((err) => {
        console.error("Error fetching previous messages:", err);
      });
  };

  const getUserId = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) return userId;

    let uid = Math.random().toString(36).substr(2, 9);
    localStorage.setItem("userId", uid);
    return uid;
  };

  const getCurrentTimestamp = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const day = String(now.getDate()).padStart(2, "0");

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  console.log(getCurrentTimestamp());

  useEffect(() => {
    (async () => {
      const socket = new WebSocket(websocketUrl);
      let uid = await getUserId();
      setUserId(uid);

      socket.onopen = () => {
        console.log("WebSocket connected");
        socket.send(
          JSON.stringify({ type: "join", room, username, userId: uid })
        );
        fetchPreviousMessages();
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received data", data);
        switch (data.type) {
          case "message":
            setMessages((prevMessages) => [
              ...prevMessages,
              { ...data, timestamp: getCurrentTimestamp() },
            ]);
            break;
          case "userList":
            setUsers(data.users);
            break;
          case "typing":
            setIsSomeOneTyping(data.typing);
            break;
          case "userJoined":
          case "userLeft":
            // You can add notifications for user joining/leaving if desired
            break;
        }
      };

      setWs(socket);

      return () => {
        socket.close();
      };
    })();
  }, [room]);

  const leaveRoom = () => {
    if (ws) {
      ws.send(JSON.stringify({ type: "leave" }));
    }
    setMessages([]);
    navigate("/");
  };

  useEffect(() => {
    chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = () => {
    if (inputMessage.trim() && ws) {
      ws.send(JSON.stringify({ type: "message", message: inputMessage }));
      setInputMessage("");
      setTyping(false);
    }
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    console.log("typing,", typing);
    if (!typing) {
      console.log("typing...");
      setTyping(true);
      ws.send(JSON.stringify({ type: "typing", isTyping: true }));
      setTimeout(() => {
        setTyping(false);
        ws.send(JSON.stringify({ type: "typing", isTyping: false }));
      }, 3000);
    }
  };

  const getAvatarColor = (userId) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ];
    return colors[userId.charCodeAt(0) % colors.length];
  };

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString.replace(" ", "T")); // Convert string to valid Date format

    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  };

  return (
    <div className="flex h-screen bg-gradient-to-r from-blue-400 to-purple-500 p-4">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto bg-white rounded-lg shadow-2xl overflow-hidden">
        <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">{room}</h1>
          <button
            onClick={leaveRoom}
            className="bg-red-500 text-white px-4 py-2 rounded-full hover:bg-red-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Leave Room
          </button>
        </div>
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-100"
          style={{
            backgroundImage:
              "url('https://www.transparenttextures.com/patterns/cubes.png')",
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.userId === userId ? "justify-end" : "justify-start"
              } items-start space-x-2 animate-fade-in-up`}
            >
              {msg.userId !== userId && (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(
                    msg.userId
                  )} shadow-md`}
                >
                  {msg.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-md ${
                  msg.userId === userId
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-800"
                }`}
              >
                <p className="font-bold text-sm mb-1">{msg.username}</p>
                <p className="text-sm">{msg.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    msg.userId === userId
                      ? "text-blue-200 text-right" // Lighter color for sent messages
                      : "text-gray-500 text-left" // Standard color for received messages
                  }  bottom-1 right-2`}
                >
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
              {msg.userId === userId && (
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(
                    msg.userId
                  )} shadow-md`}
                >
                  {msg.username.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>
        {isSomeOneTyping && (
          <div className="text-sm text-gray-500 italic px-4 py-2 bg-gray-100">
            someone is typing...
          </div>
        )}
        <div className="bg-white p-4 flex items-center space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={handleTyping}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-300 ease-in-out"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Send
          </button>
        </div>
      </div>
      <div className="w-64 bg-white shadow-md p-4 ml-4 rounded-lg">
        <h2 className="text-lg font-bold mb-4 text-gray-800">Users in Room</h2>
        <ul className="space-y-2">
          {users.map((user, index) => (
            <li key={index} className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${getAvatarColor(
                  user
                )} shadow-md`}
              >
                {user.charAt(0).toUpperCase()}
              </div>
              <span className="text-gray-700">{user}</span>
              <span className="w-2 h-2 bg-green-500 rounded-full ml-auto"></span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ChatRoom;
