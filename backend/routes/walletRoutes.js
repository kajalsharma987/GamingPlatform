const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { walletLimiter } = require("../middleware/rateLimiters");
const { transferSchema } = require("../validators/walletValidators");
const { transfer } = require("../controllers/walletController");

router.post("/transfer", auth, walletLimiter, validate(transferSchema), transfer);

module.exports = router;
