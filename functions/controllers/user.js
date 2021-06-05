/* eslint-disable linebreak-style */
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const admin = require("firebase-admin");
const APP_NAME = "Service Me";

exports.get = async (req, res, next) => {
  try {
    res.render("user/index", {title: "user page"});
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getByEmail = async (req, res, next) => {
  try {
    const userResponse = await admin.auth().getUserByEmail(req.query.email);
    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getById = async (req, res, next) => {
  try {
    const userResponse = await admin.auth().getUser(req.params.uid);
    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getByPhone = async (req, res, next) => {
  try {
    // eslint-disable-next-line max-len
    const userResponse = await admin.auth().getUserByPhoneNumber(req.query.phoneNumber);
    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.create = async (req, res, next) => {
  try {
    // create user credentails
    const adminResponse = await admin.auth().createUser(req.body);
    // eslint-disable-next-line max-len
    const userResponse = await admin.firestore().collection("users").doc(adminResponse.uid).set({
      email: adminResponse.email,
      displayName: adminResponse.displayName,
    });

    const email = adminResponse.email; // The email of the user.
    // eslint-disable-next-line max-len
    const displayName = adminResponse.displayName; // The display name of the user.

    const transporter = nodemailer.createTransport({
      host: functions.config().mailgun.host,
      port: functions.config().mailgun.port,
      secure: false,
      auth: {
        user: functions.config().mailgun.user,
        pass: functions.config().mailgun.pass,
      },
    });
    const mailOptions = {
      from: `${APP_NAME} <${functions.config().mailer.receiver}>`,
      to: email,
    };
    // The user subscribed to the newsletter.
    mailOptions.subject = `Welcome to ${APP_NAME}!`;
    // eslint-disable-next-line max-len
    mailOptions.text = `Hey ${displayName || ""}! Welcome to ${APP_NAME}. I hope you will enjoy our service.`;
    await transporter.sendMail(mailOptions);

    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.update = async (req, res, next) => {
  try {
    // eslint-disable-next-line max-len
    const userResponse = await admin.auth().updateUser(req.params.uid, req.body);
    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.delete = async (req, res, next) => {
  try {
    // delete user
    await admin.auth().deleteUser(req.params.uid);

    // eslint-disable-next-line max-len
    const userResponse = await admin.firestore().collection("users").doc(req.params.uid).delete();

    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.deleteAll = async (req, res, next) => {
  try {
    await admin.auth().deleteUsers(req.query.uids);

    const uids = req.query.uids;
    uids.forEach(async (uid) => {
      // eslint-disable-next-line max-len
      await admin.firestore().collection("users").doc(uid).delete();
    });
    res.status(200).json({
      message: "Deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.getAll = async (req, res, next) => {
  try {
    // eslint-disable-next-line max-len
    const userResponse = await admin.auth().listUsers(1000, req.query.nextPageToken);
    res.status(200).json(userResponse);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
