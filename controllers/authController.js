const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { promisify } = require("util");

exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  // create token
  const token = JWT.sign({ id: newUser._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  //create cookie
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // prevents client side access to the cookie
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  res.cookie("jwt", token, cookieOptions);

  res.status(201).json({
    status: "success",
    message: "you signed up successfully",
    token,
    data: {
      newUser,
    },
  });
});

exports.logIn = catchAsync(async (req, res, next) => {
  console.log(req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new AppError(`please provide your email and password`, 400));
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(
      new AppError(`either your email or password is incorrect`, 400)
    );
  }

  const token = JWT.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") {
    cookieOptions.secure = true;
  }

  res.cookie("jwt", token, cookieOptions);

  res.status(201).json({
    status: "success",
    message: "you logged In successfully",
    token,
    data: {
      user,
    },
  });
});

exports.logOut = catchAsync(async (req, res, next) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
    message: "you logged out successfully",
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("you aren't authorized. Please log in", 403));
  }

  const decoded = await promisify(JWT.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError(`this user doesn't exist any more`, 403));
  }

  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

exports.isLoggedIn = async (req, res, next) => {
  try {
    let token;
    if (req.cookies.jwt) {
      // Check if token is in cookies
      token = req.cookies.jwt;

      if (!token) {
        return next();
      }

      // 2) Verify token
      const decoded = await promisify(JWT.verify)(
        token,
        process.env.JWT_SECRET
      );

      // 3) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 4) Check if user changed password after the token was issued
      // (This step is optional, but recommended for security)

      // Grant access to protected route
      res.locals.user = currentUser; // put the user data on the request object
      return next(); // Call the next middleware route handler
    }
  } catch (error) {
    return next();
  }

  next();
};
