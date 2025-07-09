require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.use('/signup-guardian', require('./routes/signupGuardian'));
app.use('/link-patient', require('./routes/linkPatient'));
app.use('/get-patients', require('./routes/getPatients'));
app.use('/get-guardian', require('./routes/getGuardian'));

app.listen(3000, () => console.log('Server running on port 3000'));
