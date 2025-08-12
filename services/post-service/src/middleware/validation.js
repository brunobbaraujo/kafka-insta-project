import Joi from "joi";

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details[0].message,
      });
    }
    next();
  };
};

const createPostSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
  caption: Joi.string().max(2000).allow(""),
  media_file_id: Joi.string().uuid().optional(),
});

const updatePostSchema = Joi.object({
  caption: Joi.string().max(2000).allow("").optional(),
});

const likePostSchema = Joi.object({
  user_id: Joi.string().uuid().required(),
});

export {
  validateRequest,
  createPostSchema,
  updatePostSchema,
  likePostSchema,
};
