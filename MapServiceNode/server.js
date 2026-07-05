const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = 5004;

app.use(cors());

app.get('/', (req, res) => {
    res.send("Map Service is running");
});

app.get('/api/map/directions', async (req, res) => {
    try {
        const { lat1 ,lon1, lat2, lon2 } = req.query;

        if(!lat1 || !lon1 || !lat2 || !lon2) {
            return res.status(400).json({ 
                error: 'Thiếu thông tin tọa độ' });
        }

        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

        const response = await axios.get(osrmUrl, {
            headers: {
                'User-Agent': 'CineMiuApp/1.0'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Lỗi gọi API bản đồ:', error.message);

        res.status(500).json({
            error: 'Lỗi server khi lấy đường đi'
        });
    }
});

app.listen(PORT, () => {
    console.log(`Map Service is running on http://localhost:${PORT}`);
});