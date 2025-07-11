require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // 먼저 와야 함

const userRoutes = require('./routes/user');
app.use('/users', userRoutes);

const patientRoutes = require('./routes/patient');
app.use('/patients', patientRoutes);

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
