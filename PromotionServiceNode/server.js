require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
  console.log(`Promotion Service Node đang chạy ở port ${PORT}`);
});