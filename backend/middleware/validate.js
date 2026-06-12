module.exports = (schema) => (req, res, next) => {
  const { value, error } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return res.status(400).json({
      message: error.details.map((detail) => detail.message).join(", ")
    });
  }

  req.body = value;
  next();
};
