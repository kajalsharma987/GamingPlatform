const Joi = require("joi");

const loginSchema = Joi.object({
  username: Joi.string().trim().min(2).max(100).required(),
  password: Joi.string().min(4).max(100).required()
});

const createUserSchema = Joi.object({
  username: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(150).allow("", null),
  phone: Joi.string().trim().max(30).allow("", null),
  password: Joi.string().min(4).max(100).required(),
  role: Joi.string().valid("master", "agent", "dealer", "client", "MASTER", "DEALER", "CLIENT").required(),
  commission: Joi.number().min(0).max(100).default(0)
});

const changePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().min(4).max(100).required()
});

module.exports = {
  loginSchema,
  createUserSchema,
  changePasswordSchema
};
