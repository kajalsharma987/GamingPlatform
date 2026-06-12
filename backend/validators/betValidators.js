const Joi = require("joi");

const placeBetSchema = Joi.object({
  game_key: Joi.string().max(40).default("cricket"),
  live_game_id: Joi.number().integer().positive().allow(null),
  match_id: Joi.number().integer().positive().allow(null),
  market_id: Joi.number().integer().positive().allow(null),
  runner_id: Joi.number().integer().positive().allow(null),
  market: Joi.string().max(100).allow("", null),
  selection: Joi.string().max(100).required(),
  bet_type: Joi.string().valid("BACK", "LAY", "YES", "NO", "LAGAI", "KHAI").default("BACK"),
  amount: Joi.number().positive().precision(2).required(),
  odds: Joi.number().positive().precision(2).required(),
  request_id: Joi.string().max(100).allow("", null)
});

const settleMarketSchema = Joi.object({
  winning_runner_id: Joi.number().integer().positive().allow(null),
  winning_selection: Joi.string().max(100).allow("", null),
  result: Joi.string().valid("WIN", "VOID").required()
});

module.exports = {
  placeBetSchema,
  settleMarketSchema
};
