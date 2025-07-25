const express = require("express");
const router = express.Router();
const viewsController = require("../controllers/viewController");
const authController = require("../controllers/authController");
router.get("/", viewsController.getLogin);
router.use(authController.isLoggedIn);
router.get("/chats", authController.protect, viewsController.getHome);
module.exports = router;
