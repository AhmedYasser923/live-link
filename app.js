const express = require("express");
const app = express();
const globalErrorHandler = require("./controllers/errorController");
const AppError = require("./utils/appError");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

// if (process.env.NODE_ENV === "development") {
//   app.use(morgan("dev"));
// }

app.set("view engine", "pug");
app.use(express.static(`${__dirname}/public`));
// parser middlewares
app.use(express.json());
app.use(cookieParser());

//routes
const authRouter = require("./routes/authRoutes");
const usersRouter = require("./routes/userRoutes");
const messagesRouter = require("./routes/messageRoutes");
const conversationRouter = require("./routes/conversationRoute");
const viewsRouter = require("./routes/viewsRouter");
app.use("/", viewsRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/conversations", conversationRouter);
app.all("*", (req, res, next) => {
  return next(new AppError("this route doesn not exist", 404));
});

//global error handler middleware
app.use(globalErrorHandler);
module.exports = app;
