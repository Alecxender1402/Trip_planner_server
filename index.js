require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const chatRoutes = require('./routes/chat'); 
const itineraryRoutes = require('./routes/itineraries'); 

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); 
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("Database connection Success.");
}).catch((err) => {
  console.error("Mongo Connection Error", err);
});

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes); 
app.use('/api/itineraries', itineraryRoutes);

app.get('/', (req, res) => {
  res.send({ error: false, message: "Welcome to the Travel Buddy API" });
});

app.get('/ping', (req, res) => {
  res.send({ error: false, message: "Server is healthy" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started listening on PORT : ${PORT}`);
});
