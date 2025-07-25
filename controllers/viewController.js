const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const User = require("../models/userModel");
const Conversation = require("../models/conversationModel");
const Message = require("../models/messageModel");

exports.getLogin = (req, res) => {
  res.status(200).render("login", {
    title: "Login",
    message: "Welcome to the login page!",
  });
};

exports.getHome = (req, res) => {
  res.status(200).render("home", {
    title: "home",
  });
};
