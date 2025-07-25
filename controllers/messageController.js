const Message = require("../models/messageModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Conversation = require("../models/conversationModel");

exports.createMessage = catchAsync(async (req, res, next) => {
  const sender = req.user.id;
  const { receiver, content } = req.body;

  if (!receiver || !content) {
    return next(new AppError("Receiver and content are required", 400));
  }

  const message = await Message.create({ sender, receiver, content });

  res.status(201).json({
    status: "success",
    data: {
      message,
    },
  });
});

exports.getAllMessagesForUser = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const messages = await Message.find({
    $or: [{ sender: userId }, { receiver: userId }],
  }).sort("-createdAt");

  res.status(200).json({
    status: "success",
    results: messages.length,
    data: {
      messages,
    },
  });
});

exports.getMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);

  if (!message) {
    return next(new AppError("No message found with that ID", 404));
  }

  const userId = req.user.id;
  console.log(message.sender.toString());
  if (
    message.sender._id.toString() !== userId &&
    message.receiver._id.toString() !== userId
  ) {
    return next(
      new AppError("You are not authorised to view this message", 403)
    );
  }

  res.status(200).json({
    status: "success",
    data: {
      message,
    },
  });
});

exports.deleteMessage = catchAsync(async (req, res, next) => {
  const message = await Message.findById(req.params.messageId);
  console.log(req.user.id);

  if (!message) {
    return next(new AppError("No message found with that ID", 404));
  }

  if (message.sender._id.toString() !== req.user.id) {
    return next(new AppError("You can only delete your own messages", 403));
  }

  await Message.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

exports.updateMessage = catchAsync(async (req, res, next) => {
  const updatedMessage = await Message.findByIdAndUpdate(
    req.params.messageId,
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!updatedMessage) {
    return next(new AppError("No message found with that ID", 404));
  }
  res.status(200).json({
    status: "success",
    message: "message has been updated",
    data: {
      updatedMessage,
    },
  });
});

exports.getMessagesOfConversation = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const conversationMessages = await Message.find({
    conversation: req.params.convoId,
  })
    .sort({ createdAt: 1 }) // newest first
    .populate("sender")
    .populate("receiver");

  await Message.updateMany(
    {
      conversation: req.params.convoId,
      receiver: req.user.id,
      seen: false,
    },
    {
      $set: { seen: true },
    }
  );

  if (!conversationMessages) {
    return res.status(200).json({
      status: "success",
      message: "no messages found",
      data: null,
    });
  }
  res.status(200).json({
    status: "success",
    message: "messages found",
    results: conversationMessages.length,
    data: {
      conversationMessages,
    },
  });
});
