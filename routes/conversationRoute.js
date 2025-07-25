const express = require("express");
const router = express.Router({ mergeParams: true });
const conversationController = require("../controllers/conversationController");
const authController = require("../controllers/authController");
router.use(authController.protect);

router.route("/").get(conversationController.getConversations);
router
  .route("/:buddyId/messages")
  .post(conversationController.sendMessage)
  .get(conversationController.getConversationBetween);

router
  .route("/:convoId")
  .get(conversationController.getConversation)
  .delete(conversationController.deleteConversation);

module.exports = router;
