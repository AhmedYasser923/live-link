const mongoose = require("mongoose");
const Conversation = require("./conversationModel");

const messageSchema = mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    receiver: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    content: {
      type: String,
    },
    conversation: {
      type: mongoose.Schema.ObjectId,
      ref: "Conversation",
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
messageSchema.index({ conversation: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ receiver: 1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
