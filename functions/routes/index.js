/* eslint-disable linebreak-style */
const express = require("express");

// eslint-disable-next-line new-cap
const router = express.Router();
/**
 * load controller
 */
const ctrlr = require("../controllers/index");

/* GET home page. */
router.get("/", ctrlr.get);

module.exports = router;
