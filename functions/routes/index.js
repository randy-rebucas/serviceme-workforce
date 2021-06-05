/* eslint-disable linebreak-style */
const express = require("express");

// eslint-disable-next-line new-cap
const router = express.Router();

/* GET home page. */
router.get("/", async (req, res, next) => {
  res.send("Hello from service-me on Firebase!");
});

module.exports = router;
