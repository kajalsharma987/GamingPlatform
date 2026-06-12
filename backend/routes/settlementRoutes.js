const express = require("express");

const router = express.Router();

const controller =
require("../controllers/settlementController");

router.post(
  "/settle",
  controller.settle
);

module.exports = router;