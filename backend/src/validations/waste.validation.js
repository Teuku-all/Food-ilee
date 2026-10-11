const Joi =
  require('joi');

const createWasteSchema =
  Joi.object({

    title:
      Joi.string()
        .min(3)
        .required(),

    description:
      Joi.string()
        .min(5)
        .required(),

    price:
      Joi.number()
        .required(),

    stock:
      Joi.number()
        .required()
  });

module.exports = {

  createWasteSchema
};