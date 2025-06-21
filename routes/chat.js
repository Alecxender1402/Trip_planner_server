const express = require('express');
const axios = require('axios');
const mongoose = require('mongoose');
const Message = require('../models/Message');
const auth = require('../middleware/auth');

const router = express.Router();

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"; // Replace with actual endpoint if different

router.post('/message', auth, async (req, res) => {
  try {
    const { message, itineraryId, itineraryContext } = req.body;
    if (!message) return res.status(400).json({ message: "Message is required" });

    // Save user message
    const userMsg = new Message({
      content: message,
      sender: 'user',
      userId: req.user.userId,
      itineraryId: itineraryId || undefined,
    });
    await userMsg.save();

    // Prepare messages for DeepSeek (system, context, etc. as needed)
    const messagesForDeepSeek = [
      ...(itineraryContext ? [{ role: "system", content: itineraryContext }] : []),
      { role: "user", content: message }
    ];

    // Call DeepSeek API using axios
    const deepseekResponse = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: "deepseek-chat", // Or your specific model name
        messages: messagesForDeepSeek,
        temperature: 0.7,
        // max_tokens: 512, // Optional: adjust as needed
      },
      {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
        }
      }
    );

    const data = deepseekResponse.data;
    const botReply = data.choices?.[0]?.message?.content || "Sorry, no response from DeepSeek.";

    // Save bot message
    const botMsg = new Message({
      content: botReply,
      sender: 'bot',
      userId: req.user.userId,
      itineraryId: itineraryId || undefined,
    });
    await botMsg.save();

    res.json({ response: botReply });
  } catch (err) {
    // Axios errors have a response property with more details
    if (err.response) {
      return res.status(500).json({ message: "DeepSeek API error", error: err.response.data });
    }
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
