const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
router.post("/signup", authController.signUp);
router.post("/login", authController.logIn);
router.get("/logout", authController.logOut);

module.exports = router;
