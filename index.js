require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.use('/signup-guardian', require('./routes/signupGuardian'));
app.use('/register-info', require('./routes/registerInfo'));
app.use('/link-patient', require('./routes/linkPatient'));
app.use('/get-patients', require('./routes/getPatient'));
app.use('/get-guardian', require('./routes/getGuardian'));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 내부 오류' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
