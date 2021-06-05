const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const logger = require("morgan");
const helmet = require("helmet");


const app = express();

// Automatically allow cross-origin requests
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};

const indexRouter = require("./routes/index");
const userRouter = require("./routes/users");

app.use(cors(corsOptions));

// remove default powered by on header
app.disable("x-powered-by");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(helmet());

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false, limit: "4MB"}));

app.use("/", indexRouter);
app.use("/user", userRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// module.exports = app;
exports.api = functions.https.onRequest(app);

