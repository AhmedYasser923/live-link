const AppError = require("../utils/appError");

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  if (process.env.NODE_ENV === "development") {
    if (req.originalUrl.startsWith("/api")) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack,
      });
    }
    return res.status(400).render("error", {
      error: err.message,
    });
  } else if (process.env.NODE_ENV === "production") {
    let error = Object.create(err);
    if (error.name === "CastError") {
      const message = `Invalid ${error.path}: ${error.value}`;
      error = new AppError(message, 400);
    }
    if (error.code === 11000) {
      const message = `${error.keyValue.name} is a dublicate please choose a different name`;
      error = new AppError(message, 400);
    }

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)
        .map((el) => el.message)
        .join(". ");
      error = new AppError(message, 400);
    }
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
        error: error,
      });
    } else {
      console.log(err);
      return res.status(500).json({
        status: "error",
        message: "something went wrong",
        error: err,
      });
    }
  }
};
