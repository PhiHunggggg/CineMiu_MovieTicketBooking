import  { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CinemaMap.css';


delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function CinemaMap({ cinemaLat, cinemaLng, cinemaName }) {

    const [userPos, setUserPos] = useState(null);
    const [routePath, setRoutePath] = useState([]);

    const cinemaPos = {
        lat: Number(cinemaLat),
        lng: Number(cinemaLng)
    };

    // Lấy vị trí hiện tại của người dùng
    useEffect(() => {

        if (!navigator.geolocation) {
            console.log("Trình duyệt không hỗ trợ Geolocation");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserPos({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            (error) => {
                console.log("Không lấy được vị trí:", error);
            }
        );

    }, []);

    // Gọi Backend Node.js lấy đường đi
    useEffect(() => {

        if (!userPos) return;
        if (!cinemaPos.lat || !cinemaPos.lng) return;

        const apiUrl =
            `http://localhost:5004/api/map/directions` +
            `?lat1=${userPos.lat}` +
            `&lon1=${userPos.lng}` +
            `&lat2=${cinemaPos.lat}` +
            `&lon2=${cinemaPos.lng}`;

        fetch(apiUrl)
            .then((response) => response.json())
            .then((data) => {

                if (data.routes && data.routes.length > 0) {

                    const path = data.routes[0].geometry.coordinates.map(
                        (point) => [point[1], point[0]]
                    );

                    setRoutePath(path);
                }

            })
            .catch((error) => {
                console.log("Lỗi khi gọi MapService:", error);
            });

    }, [userPos, cinemaPos.lat, cinemaPos.lng]);

    if (!cinemaPos.lat || !cinemaPos.lng) {
        return null;
    }

    return (
        <div className="cinema-map-wrapper">

            <MapContainer
                center={cinemaPos}
                zoom={13}
                className="cinema-map"
            >

                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker position={cinemaPos}>
                    <Popup>{cinemaName}</Popup>
                </Marker>

                {userPos && (
                    <Marker position={userPos}>
                        <Popup>Vị trí của bạn</Popup>
                    </Marker>
                )}

                {routePath.length > 0 && (
                    <Polyline
                        positions={routePath}
                        color="blue"
                        weight={5}
                    />
                )}

            </MapContainer>

        </div>
    );
}