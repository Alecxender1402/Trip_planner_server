const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: { type: String, required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  itineraryId: { type: String },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// Create and export the model properly
const Message = mongoose.model('Message', messageSchema);
module.exports = Message;  // Correct export
