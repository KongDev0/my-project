import Joi from 'joi';

export const signupSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().trim(),
  password: Joi.string().min(4).max(100).required(),
});

export const loginSchema = Joi.object({
  username: Joi.string().required().trim(),
  password: Joi.string().required(),
});

export const facultySchema = Joi.object({
  name: Joi.string().min(1).max(200).required().trim(),
});

export const buildingSchema = Joi.object({
  building_name: Joi.string().min(1).max(200).required().trim(),
  floor: Joi.number().integer().min(0).default(0),
  faculty_id: Joi.string().required(),
});

// ✅ Toilet schema
export const toiletSchema = Joi.object({
  toilet_name: Joi.string().required(),
  toilet_type: Joi.string()
    .valid('male', 'female', 'unisex', 'accessible')
    .required(),
  status: Joi.string().valid('open', 'closed', 'maintenance').default('open'),

  // ใช้ restroom แทน male_rooms, female_rooms, disabled_rooms
  restrooms: Joi.number().integer().min(0).default(0),

  urinals: Joi.number().integer().min(0).default(0),
  sinks: Joi.number().integer().min(0).default(0),

  open_time: Joi.string()
    .pattern(/^([0-1]\d|2[0-3]):[0-5]\d$/)
    .default('00:00'),
  close_time: Joi.string()
    .pattern(/^([0-1]\d|2[0-3]):[0-5]\d$|^24:00$/)
    .default('23:59'),

  days: Joi.array()
    .items(Joi.string().valid('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'))
    .default([]),

  amenities: Joi.array().items(Joi.string()).default([]),

  building_id: Joi.string().required(),
  latitude: Joi.number().allow(null),
  longitude: Joi.number().allow(null),
  image_url: Joi.string().uri().allow(null, ''),
});

export const idSchema = Joi.string()
  .pattern(/^[A-Za-z0-9_-]+$/)
  .required();

export const reportSchema = Joi.object({
  toilet_id: Joi.string().required(),
  toilet_name: Joi.string().allow('', null),
  message: Joi.string().min(3).max(2000).allow('', null),
});
