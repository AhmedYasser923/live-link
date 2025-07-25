const Conversation = require("../models/conversationModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Message = require("../models/messageModel");

//
// exports.sendMessage = catchAsync(async (req, res, next) => {
//   const sender = req.user._id;
//   const receiver = req.params.buddyId;
//   const content = req.body.content;

//   if (sender.toString() === receiver.toString()) {
//     return next(new AppError(`you can't send a message to yourself`, 400));
//   }

//   let conversation = await Conversation.findOne({
//     participants: { $all: [sender, receiver], $size: 2 },
//   }).select("updatedAt");

//   if (!conversation) {
//     conversation = await Conversation.create({
//       participants: [sender, receiver],
//       updatedAt: Date.now(),
//     });
//   }

//   const message = await Message.create({
//     sender,
//     receiver,
//     content,
//     conversation: conversation._id,
//   });

//   conversation.updatedAt = Date.now();
//   await conversation.save();

//   res.status(200).json({
//     status: "success",
//     message: "message sent successfully",
//     data: {
//       message,
//     },
//   });
// });

exports.sendMessage = catchAsync(async (req, res, next) => {
  const sender = req.user._id;
  const receiver = req.params.buddyId;
  const content = req.body.content;

  if (sender.toString() === receiver.toString()) {
    return next(new AppError("You can't send a message to yourself", 400));
  }

  // Find or create conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [sender, receiver], $size: 2 },
  }).lean();

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [sender, receiver],
      updatedAt: Date.now(),
    });
  }

  // Create message
  const message = await Message.create({
    sender,
    receiver,
    content,
    conversation: conversation._id,
  });

  // Update conversation timestamp (non-blocking)
  Conversation.findByIdAndUpdate(conversation._id, {
    $set: {
      updatedAt: Date.now(),
      lastMessage: message._id,
      lastMessageSender: message.sender._id,
    },
  }).exec();

  // Return response immediately
  res.status(200).json({
    status: "success",
    message: "Message sent successfully",
    data: { message },
  });
});

//get conversation based on conversationId
exports.getConversation = catchAsync(async (req, res, next) => {
  console.log(req.query);
  const conversation = await Conversation.findById(req.params.convoId);

  if (!conversation) {
    return next(new AppError("there is no conversation between these 2 users"));
  }

  res.status(200).json({
    status: "success",
    message: "conversation found",
    data: {
      conversation,
    },
  });
});

//get all conversations for the currently logged in user
exports.getConversations = catchAsync(async (req, res, next) => {
  const conversations = await Conversation.find({
    participants: { $in: [req.user._id] },
  })
    .populate({ path: "lastMessage", select: "content seen" })
    .sort({ updatedAt: 1 });

  if (conversations.length === 0) {
    return res.status(200).json({
      status: "success",
      message: "no conversations found",
      data: null,
    });
  }

  res.status(200).json({
    status: "success",
    message: "conversations found",
    data: {
      conversations,
    },
  });
});

//get conversation between logged in user and a buddy
exports.getConversationBetween = catchAsync(async (req, res, next) => {
  const currentUser = req.user._id || req.body.currentUser;
  const buddy = req.params.buddyId;

  const conversation = await Conversation.findOne({
    participants: { $all: [currentUser, buddy], $size: 2 },
  }).lean();

  if (!conversation) {
    return res.status(200).json({
      status: "success",
      message: "no conversation found",
      data: null,
    });
  }

  res.status(200).json({
    status: "success",
    message: "conversation found",
    data: {
      conversation,
    },
  });
});

exports.deleteConversation = catchAsync(async (req, res, next) => {
  const deletedConversation = await Conversation.findByIdAndDelete(
    req.params.convoId
  );

  res.status(204).json({
    status: "success",
    data: null,
  });
});
