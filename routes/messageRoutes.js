const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const messageController = require("../controllers/messageController");
const conversationRouter = require("../routes/conversationRoute");

router.use(authController.protect);
router
  .route("/")
  .post(messageController.createMessage)
  .get(messageController.getAllMessagesForUser);

router
  .route("/:messageId")
  .get(messageController.getMessage)
  .delete(messageController.deleteMessage)
  .patch(messageController.updateMessage);

router
  .route("/conversation/:convoId")
  .get(messageController.getMessagesOfConversation);
module.exports = router;
