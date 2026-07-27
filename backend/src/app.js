const express = require('express');
const cors = require('cors');
const linkRoutes = require('./routes/linkRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/', linkRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
