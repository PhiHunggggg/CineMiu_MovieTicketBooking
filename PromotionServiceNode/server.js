require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 5004;
const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:5000';

app.use(cors());
app.use(express.json());


app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'PromotionServiceNode' });
});


app.get('/api/node-promotions', async (req, res) => {
    try {

        const response = await axios.get(`${API_GATEWAY_URL}/api/promotions`);

        const promotions = response.data;

        res.json({
            success: true,
            source: 'Node.js (via API Gateway)',
            data: promotions
        });
    } catch (error) {
        console.error("Lỗi khi gọi C# API:", error.message);
        res.status(500).json({ success: false, message: 'Lỗi khi gọi qua API Gateway' });
    }
});

// CronJob lúc 8:00 
cron.schedule('0 8 * * *', async () => {
    console.log('[CronJob] Bắt đầu chạy tác vụ kiểm tra khuyến mãi...');
    try {
        console.log('[CronJob] Hoàn tất!');
    } catch (error) {
        console.error('[CronJob] Có lỗi xảy ra:', error.message);
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Promotion Service Node đang chạy ở port ${PORT}`);
    console.log(`🔗 API Gateway URL được cấu hình: ${API_GATEWAY_URL}`);
});