const express = require('express');
const axios = require('axios');
const Itinerary = require('../models/Itinerary');
const auth = require('../middleware/auth');

const router = express.Router();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

// Utility to parse DeepSeek's response JSON from the content string
function parseDeepSeekResponse(data) {
  let content = data.choices?.[0]?.message?.content || "";
  let itineraryData;
  try {
    itineraryData = JSON.parse(content);
  } catch (e) {
    // Try to extract JSON from the text
    const jsonMatch = content.match(/\{[\s\S]*\}/m);
    if (!jsonMatch) throw new Error("Failed to parse JSON from DeepSeek response");
    itineraryData = JSON.parse(jsonMatch[0]);
  }
  return itineraryData;
}

// --- 1. Generate and save new itinerary using DeepSeek ---
router.post('/generate', auth, async (req, res) => {
  try {
    const { destination, budget, duration, companions, interests } = req.body;
    if (!destination || !budget || !duration || !companions || !interests)
      return res.status(400).json({ message: "Missing required fields" });

    // Build prompt for DeepSeek
    const prompt = `
      Create a detailed travel itinerary for a ${duration}-day trip to ${destination} with a budget of ${budget}.
      The traveler is going with ${companions} and is interested in ${interests.join(", ")}.
      Please provide:
      1. A day-by-day plan with specific activities. Each activity MUST include:
      - time
      - title (short name of the place or activity)
      - description
      - location
      - cost
      2. Hotel recommendations that fit within the budget - each hotel MUST include:
          - name
          - description
          - price per night
          - rating (on a scale of 1-5)
          - image URL
          - location
      3. Make sure the total cost stays within the budget of ${budget}
      Format the response as a JSON object with the following structure:
      {
        "dayPlans": [ ... ],
        "hotels": [ ... ],
        "totalCost": 2500
      }
      IMPORTANT: 
      - Respond ONLY with the JSON object, no additional text.
      - Every hotel MUST have a rating between 1-5.
    `;

    // Call DeepSeek API
    const deepseekResponse = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 4000,
        stream: false
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        }
      }
    );

    // Parse DeepSeek's response
    const itineraryData = parseDeepSeekResponse(deepseekResponse.data);

    if (itineraryData.hotels && Array.isArray(itineraryData.hotels)) {
      itineraryData.hotels = itineraryData.hotels.map(hotel => {
        // Ensure rating exists and is a number
        let rating = hotel.rating;
        if (typeof rating === 'string') {
          rating = parseFloat(rating);
        }
        if (typeof rating !== 'number' || isNaN(rating)) {
          rating = 0; // Default to 0 if invalid
        }
        return {
          ...hotel,
          rating: Math.min(5, Math.max(0, rating)) // Clamp between 0-5
        };
      });
    }

    // Save to MongoDB
    const itinerary = new Itinerary({
      destination,
      budget,
      duration,
      companions,
      dayPlans: itineraryData.dayPlans,
      hotels: itineraryData.hotels,
      totalCost: itineraryData.totalCost,
      userId: req.user.userId,
    });
    await itinerary.save();

    res.json(itinerary);
  } catch (error) {
    console.error("Error generating itinerary:", error);
    res.status(500).json({
      message: "Error generating itinerary",
      error: error.message || error,
    });
  }
});

// --- 2. Save an existing itinerary (from frontend) ---
router.post('/', auth, async (req, res) => {
  try {
    const {
      destination,
      budget,
      duration,
      companions,
      dayPlans,
      hotels,
      totalCost,
    } = req.body;

    if (!destination || !budget || !duration || !companions || !dayPlans || !hotels || !totalCost)
      return res.status(400).json({ message: "Missing required fields" });

    const itinerary = new Itinerary({
      destination,
      budget,
      duration,
      companions,
      dayPlans,
      hotels,
      totalCost,
      userId: req.user.userId,
    });
    await itinerary.save();
    res.status(201).json(itinerary);
  } catch (error) {
    console.error("Error saving itinerary:", error);
    res.status(500).json({
      message: "Error saving itinerary",
      error: error.message || error,
    });
  }
});

// --- 3. Load an itinerary by ID ---
router.get('/:id', auth, async (req, res) => {
  try {
    const itinerary = await Itinerary.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!itinerary)
      return res.status(404).json({ message: "Itinerary not found" });
    res.json(itinerary);
  } catch (error) {
    console.error("Error loading itinerary:", error);
    res.status(500).json({
      message: "Error loading itinerary",
      error: error.message || error,
    });
  }
});

module.exports = router;
