require('dotenv').config();
require('./scheduler/alarmScheduler');

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/link');
const userRoutes = require('./routes/users');
const registerRouter = require('./routes/register');
const memoryRouter = require('./routes/memory');
const alarmsRouter = require('./routes/alarms');
const voicememoryrouter = require('./routes/voicememory');
const voiceRouter = require('./routes/voice');

app.use('/auth', authRoutes);
app.use('/link', linkRoutes);
app.use('/users', userRoutes);
app.use('/register', registerRouter);
app.use('/memory', memoryRouter);
app.use('/alarms', alarmsRouter);
app.use('/voicememory', voicememoryrouter);
app.use('/voice', voiceRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 CareLink API running on port 3000');
});

