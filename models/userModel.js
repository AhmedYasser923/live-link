const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: [true, "please provide your name"],
  },
  email: {
    type: String,
    required: [true, "please provide your email address"],
    unique: [true, "this email is already registered"],
    validate: {
      validator: function (email) {
        return validator.isEmail(this.email);
      },
      message: "please provide a valid email address",
    },
  },
  password: {
    type: String,
    required: [true, "please provide your password"],
    minLength: [8, "password must me be 8 characters or more"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "please provide your password"],
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: "passwords are not the same",
    },
  },
  photo: {
    type: String,
  },
});

//encrypt password
userSchema.pre("save", async function (next) {
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

//compare passwords
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
