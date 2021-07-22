// require joi to verify no error is present in our model before it goes to mongodb
const Joi = require('joi');

module.exports.campgroundSchema = Joi.object({
    campground: Joi.object({
        title: Joi.string().required(),
        location: Joi.string().required(),
        price: Joi.number().required().min(0),
        description: Joi.string().required(),
        image: Joi.string().required()
    }).required(),

})
module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        text: Joi.string().required(),
        rating: Joi.number().required().min(1).max(5)
    }).required()
})

