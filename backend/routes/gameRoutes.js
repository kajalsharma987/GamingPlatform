const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { betLimiter } = require("../middleware/rateLimiters");
const { placeBetSchema, settleMarketSchema } = require("../validators/betValidators");

const {
  getGames,
  updateGameSetting,
  placeBet,
  getBets,
  createMatch,
  updateMatch,
  createMarket,
  updateMarket,
  upsertRunner,
  settleMarket,
  getMarketHistory
} = require("../controllers/gameController");

router.get("/", auth, getGames);
router.patch("/settings/:gameKey", auth, updateGameSetting);
router.post("/bets", auth, betLimiter, validate(placeBetSchema), placeBet);
router.get("/bets", auth, getBets);
router.post("/matches", auth, createMatch);
router.patch("/matches/:id", auth, updateMatch);
router.post("/markets", auth, createMarket);
router.patch("/markets/:id", auth, updateMarket);
router.post("/markets/runners", auth, upsertRunner);
router.post("/markets/:marketId/settle", auth, validate(settleMarketSchema), settleMarket);
router.get("/history/markets", auth, getMarketHistory);

module.exports = router;
