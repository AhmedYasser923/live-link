const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
router.use(authController.protect);
router.route("/search-users").get(userController.searchUsers);
router.route("/").get(userController.getUsers);
router.route("/:userId").get(userController.getUser);
module.exports = router;
