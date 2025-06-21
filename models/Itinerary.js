// models/Itinerary.js
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  time: String,
  title: String,
  description: String,
  location: String,
  cost: Number
});

const dayPlanSchema = new mongoose.Schema({
  day: Number,
  date: String,
  activities: [activitySchema]
});

const hotelSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  rating: Number,
  image: String,
  location: String
});

const itinerarySchema = new mongoose.Schema({
  destination: String,
  budget: Number,
  duration: Number,
  companions: String,
  dayPlans: [dayPlanSchema],
  hotels: [hotelSchema],
  totalCost: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Itinerary', itinerarySchema);
