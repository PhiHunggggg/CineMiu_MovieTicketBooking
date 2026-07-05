const express = require('express');
const cors = require('cors');

const promotionRoutes = require('./routes/promotion.routes');

const app = express();

app.use(cors());

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Promotion Service Node đang chạy');
});

app.use('/api/promotions', promotionRoutes);

module.exports = app;