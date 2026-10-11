const Joi =
  require('joi');

const registerSchema =
  Joi.object({

    email:
      Joi.string()
        .email()
        .required(),

    password:
      Joi.string()
        .min(6)
        .required(),

    name:
      Joi.string()
        .min(3)
        .required(),

    username:
      Joi.string()
        .min(3)
        .required()
  });

module.exports = {

  registerSchema
};