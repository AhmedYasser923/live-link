const mongoose = require("mongoose");
const Message = require("../models/messageModel");
const User = require("./userModel");
const conversationSchema = mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
    ],
    messagesNum: Number,
    lastMessage: {
      type: mongoose.Schema.ObjectId,
      ref: "Message",
    },
    lastMessageSender: {
      type: mongoose.Schema.ObjectId,
    },
  },

  {
    timestamps: true,
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
