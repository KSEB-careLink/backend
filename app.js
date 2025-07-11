require('dotenv').config();

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/link');
const userRoutes = require('./routes/users');

app.use('/auth', authRoutes);
app.use('/link', linkRoutes);
app.use('/users', userRoutes);

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 CareLink API running on port 3000');
});
