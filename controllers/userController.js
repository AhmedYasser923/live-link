const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().lean();

  res.status(200).json({
    status: "success",
    results: users.length,
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(200).json({
      status: "success",
      message: "no user found",
      data: null,
    });
  }
  res.status(200).json({
    status: "success",
    message: "user found",
    data: {
      user,
    },
  });
});

// GET /api/users/search?query=abc
exports.searchUsers = async (req, res) => {
  try {
    const query = req.query.query;
    const currentUserId = req.user._id; // fallback if not using auth
    console.log("controller trigged");
    console.log(req.query.query);

    const users = await User.find({
      name: { $regex: query, $options: "i" },
    })
      .select("_id name photo")
      .sort({ name: 1 });

    res.status(200).json({
      status: "success",
      data: { users },
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};
