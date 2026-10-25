const Joi = require('joi');

const createWasteSchema = Joi.object({
  title: Joi.string().min(3).required(),

  description: Joi.string().min(5).required(),

  category: Joi.string().valid('Pakan Ternak', 'Kompos').required(),

  location: Joi.string().allow('').max(180),

  price: Joi.number().integer().min(0).required(),

  stock: Joi.number().integer().min(1).max(2147483647).required(),

  weightPerUnitGrams: Joi.number().integer().min(1).max(2147483647).required(),
});

const updateWasteSchema = Joi.object({
  title: Joi.string().min(3).required(),
  description: Joi.string().min(5).required(),
  category: Joi.string().valid('Pakan Ternak', 'Kompos'),
  location: Joi.string().allow('').max(180),
  price: Joi.number().integer().min(0).required(),
  stock: Joi.number().integer().min(1).max(2147483647).required(),
  weightPerUnitGrams: Joi.number().integer().min(1).max(2147483647).required(),
});

module.exports = {
  createWasteSchema,
  updateWasteSchema,
};
