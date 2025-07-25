// const dotenv = require("dotenv");
// dotenv.config({ path: "./config.env" });
// const mongoose = require("mongoose");
// const app = require("./app");

// console.log(process.env.NODE_ENV);

// mongoose
//   .connect(process.env.DB)
//   .then(() => {
//     console.log(`App is connected to DB`);
//   })
//   .catch((error) => {
//     console.log(error);
//   });

// const port = process.env.PORT;
// app.listen(port, () => {
//   console.log(`App running on port ${port}`);
// });

const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const Message = require("./models/messageModel");
const Conversation = require("./models/conversationModel");

const mongoose = require("mongoose");
const app = require("./app");

// Connect to MongoDB
mongoose
  .connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log("✅ App is connected to DB");
  })
  .catch((error) => {
    console.error("❌ DB connection error:", error);
  });

//-------------------------------------------
mongoose.syncIndexes();
//-------------------------------------------
mongoose.connection.once("open", async () => {
  console.log("MongoDB connected ✅");

  // Warm-up query (fills index cache)
  await Message.findOne().sort({ createdAt: -1 }).lean();
  await Conversation.findOne().lean();

  console.log("🔥 MongoDB warmed up");
});

// Setup HTTP server and Socket.IO
const http = require("http"); // ⬅ NEW
const { Server } = require("socket.io"); // ⬅ NEW
const port = process.env.PORT || 4000;
const server = http.createServer(app); // ⬅ Replace app.listen()
const io = new Server(server); // ⬅ Attach Socket.IO

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("add-user", (userId) => {
    onlineUsers.set(userId, socket.id);

    console.log(onlineUsers);
    // io.emit("user-online", userId);
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });

  socket.on("send-msg", (data) => {
    const sendToSocket = onlineUsers.get(data.receiver);
    console.log("send to ", sendToSocket);
    if (sendToSocket) {
      io.to(sendToSocket).emit("msg-receive", {
        messageId: data.messageId,
        sender: data.sender,
        receiver: data.receiver,
        createdAt: data.createdAt,
        content: data.content,
        conversationId: data.conversation,
        seen: data.seen,
      });
      console.log(data);
    }
  });

  socket.on("messages-seen", ({ messages, loggedInUserId }) => {
    const messageIds = messages
      .filter((msg) => msg.sender._id !== loggedInUserId)
      .map((msg) => msg._id);

    messages.forEach((msg) => {
      const senderSocket = onlineUsers.get(msg.sender._id);
      if (senderSocket) {
        io.to(senderSocket).emit("messages-seen", { messageIds });
      }
    });
  });

  socket.on("msg-seen", ({ messageId, sender, receiver }) => {
    const senderSocket = onlineUsers.get(sender);
    if (senderSocket) {
      io.to(senderSocket).emit("msg-seen", { messageId });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("online-users", Array.from(onlineUsers.keys()));
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
