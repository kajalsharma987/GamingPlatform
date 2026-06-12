const Joi = require("joi");

const transferSchema = Joi.object({
  toUserId: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).required(),
  remark: Joi.string().max(255).allow("", null)
});

module.exports = {
  transferSchema
};
