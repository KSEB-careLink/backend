require('dotenv').config();
require('./scheduler/alarmScheduler');

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/link');
const userRoutes = require('./routes/users');
const registerRouter = require('./routes/register');
const memoryRouter = require('./routes/memory');
const alarmsRouter = require('./routes/alarms');
const geofenceFcmRouter = require('./routes/geofencefcm');
const geofenceAlertRouter = require('./routes/geofencealert');
const registerVoiceRouter = require('./routes/registervoice');
const reminderRouter = require('./routes/reminder');
const memoryLogsRouter = require('./routes/memorylogs');

// 라우터 연결
app.use('/auth', authRoutes);
app.use('/link', linkRoutes);
app.use('/users', userRoutes);
app.use('/register', registerRouter);
app.use('/memory', memoryRouter);
app.use('/alarms', alarmsRouter);
app.use('/geofencefcm', geofenceFcmRouter);
app.use('/geofencealert', geofenceAlertRouter);
app.use('/registervoice', registerVoiceRouter);
app.use('/reminder', reminderRouter); 
app.use('/memory-logs', memoryLogsRouter);

// 서버 실행
app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 CareLink API running on port ' + (process.env.PORT || 3000));
});