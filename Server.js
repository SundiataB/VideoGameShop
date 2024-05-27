const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB (replace <YOUR_MONGO_URI> with your actual MongoDB URI)
mongoose.connect('mongodb://localhost:27017/GameShop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User Schema
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  confirmPassword: String,
  ownedGames: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Game' }]
});

const User = mongoose.model('User', userSchema);

// Game Schema
const gameSchema = new mongoose.Schema({
  title: String,
  price: Number
});

const Game = mongoose.model('Game', gameSchema);

// Sign-up Route
app.post('/AccountSignUp', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  
  // Basic validation
  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // Check if the user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Save new user
  const newUser = new User({ username, email, password: hashedPassword, confirmPassword: hashedPassword });
  await newUser.save();
  
  res.status(201).json({ message: 'User registered successfully' });
});

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Purchase Route
app.post('/purchase', authenticateToken, async (req, res) => {
  const { gameId } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    const game = await Game.findById(gameId);
    if (!user || !game) {
      return res.status(404).send('User or game not found');
    }
    user.ownedGames.push(game._id);
    await user.save();
    res.status(200).send('Game purchased successfully');
  } catch (error) {
    res.status(400).send('Error processing purchase');
  }
});

// Fetch Games Route
app.get('/games', async (req, res) => {
  try {
    const games = await Game.find();
    res.status(200).json(games);
  } catch (error) {
    res.status(400).send('Error fetching games');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
