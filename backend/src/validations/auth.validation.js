const Joi = require('joi');

const registerSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),

  password: Joi.string().min(8).required(),

  name: Joi.string().trim().min(3).required(),

  username: Joi.string().trim().lowercase().min(3).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().min(1).required(),
});

module.exports = {
  registerSchema,
  loginSchema,
};
