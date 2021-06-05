/* eslint-disable linebreak-style */
const express = require("express");

// eslint-disable-next-line new-cap
const router = express.Router();

/**
 * load controller
 */
const ctrlr = require("../controllers/user");

/* GET home page. */
router.get("/", ctrlr.get);

router.get("/getByEmail", ctrlr.getByEmail);

router.get("/getById/:uid", ctrlr.getById);

router.get("/getByPhone", ctrlr.getByPhone);

router.post("/create", ctrlr.create);

router.put("/update/:uid", ctrlr.update);

router.post("/delete/:uid", ctrlr.delete);

router.post("/deleteAll", ctrlr.deleteAll);

router.get("/getAll", ctrlr.getAll);

module.exports = router;
