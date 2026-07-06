# Huong dan debug luong xem ban do rap phim trong CinemasPage

Tai lieu nay danh cho nguoi moi, di tung buoc that cham de ban hieu luong xem ban do rap phim trong `CinemasPage`.

## 1. Hieu nhanh luong nay dang chay nhu the nao

Luong xem ban do co 2 nhanh backend:

```text
1. Lay danh sach rap:

Web_Customer /cinemas
  -> cinemaApi.getAll()
  -> GET /api/cinemas
  -> API_Gateway
  -> API_Service C#
  -> Database bang cinemas

2. Xem ban do va duong di:

Nguoi dung bam nut "Ban do"
  -> render CinemaMap
  -> browser xin quyen lay vi tri hien tai
  -> fetch http://localhost:5004/api/map/directions?lat1=...&lon1=...&lat2=...&lon2=...
  -> MapServiceNode
  -> OSRM public API
  -> tra ve route geometry
  -> React Leaflet ve marker + duong di
```

File can mo:

- Trang rap: `Web_Customer/src/pages/CinemasPage/CinemasPage.jsx`
- Component ban do: `Web_Customer/src/components/CinemaMap/CinemaMap.jsx`
- CSS ban do: `Web_Customer/src/components/CinemaMap/CinemaMap.css`
- API frontend lay rap: `Web_Customer/src/services/api.js`
- Route app: `Web_Customer/src/App.jsx`
- Node map backend: `MapServiceNode/server.js`
- Gateway route map: `API_Gateway/ocelot.json`
- Backend C# danh sach rap: `API_Service/Controllers/CinemaController.cs`, `Services/Theater/CinemaService.cs`, `Repository/EFCore/Theater/CinemaRepository.cs`

## 2. Chay du cac service can thiet

Can chay toi thieu:

1. `API_Service` de lay danh sach rap.
2. `Web_Customer` de mo trang `/cinemas`.
3. `MapServiceNode` de lay duong di.

Neu ban debug qua gateway thi them:

4. `API_Gateway`.

Nhung hien tai `CinemaMap.jsx` goi thang:

```js
http://localhost:5004/api/map/directions
```

Nen phan duong di khong can gateway, chi can MapServiceNode port 5004.

## 3. Mo trang CinemasPage

Trong browser, mo:

```text
http://localhost:5173/cinemas
```

Neu Vite dung port khac thi xem terminal cua `npm run dev`, vi no se in ra URL dang chay.

Khi trang load:

1. React render `CinemasPage`.
2. `useEffect` trong `CinemasPage.jsx` chay 1 lan.
3. Goi `cinemaApi.getAll()`.
4. Frontend goi `GET /api/cinemas`.
5. Response tra ve list rap.
6. `setCinemas(data)` cap nhat state.
7. Man hinh hien card rap.

## 4. Debug frontend buoc lay danh sach rap

### Buoc 1: Mo DevTools

1. Mo browser.
2. Nhan `F12`.
3. Chon tab `Network`.
4. Tick `Preserve log` neu muon giu log khi reload.
5. Chon filter `Fetch/XHR`.
6. Reload trang `/cinemas`.

### Buoc 2: Tim request lay rap

Trong Network, tim request:

```text
GET /api/cinemas
```

Click vao request do va xem:

- `Headers`: request di den host nao.
- `Preview` hoac `Response`: danh sach rap tra ve.
- `Status Code`: phai la 200.

Response can co cac field quan trong:

```js
cinemaId
name hoac cinemaName
address
city
district
imageUrl
latitude
longitude
```

Quan trong nhat cho ban do:

```js
latitude
longitude
```

Neu 2 field nay rong, bam "Ban do" se khong hien gi vi `CinemaMap` co doan:

```js
if (!cinemaPos.lat || !cinemaPos.lng) {
    return null;
}
```

### Buoc 3: Dat breakpoint trong CinemasPage

Mo file:

```text
Web_Customer/src/pages/CinemasPage/CinemasPage.jsx
```

Dat breakpoint o doan:

```js
useEffect(() => {
  cinemaApi.getAll()
    .then(setCinemas)
    .catch(console.error)
    .finally(() => setLoading(false));
}, []);
```

Cach debug:

1. Reload trang.
2. Debugger dung o `cinemaApi.getAll()`.
3. Step over de chay request.
4. Sau khi `.then(setCinemas)` chay, xem state `cinemas`.
5. Kiem tra tung rap co `latitude`, `longitude`.

### Buoc 4: Debug filter tim kiem va thanh pho

State lien quan:

```js
search
cityFilter
filtered
```

Khi go vao o tim kiem:

```js
onChange={e => setSearch(e.target.value)}
```

Khi bam tab thanh pho:

```js
onClick={() => setCityFilter(city)}
```

Bien `filtered` loc theo:

```js
const matchCity = !cityFilter || c.city === cityFilter;
const matchSearch = !search ||
  c.name?.toLowerCase().includes(search.toLowerCase()) ||
  c.address?.toLowerCase().includes(search.toLowerCase());
```

Bai tap:

1. Dat breakpoint ngay dong `const filtered = cinemas.filter(...)`.
2. Go tu khoa vao search.
3. Xem `search`, `cityFilter`, `cinemas.length`, `filtered.length`.

## 5. Debug thao tac bam nut Ban do

Trong moi card rap co nut:

```js
<button
  type="button"
  className="cp-cinema-card__map-btn"
  onClick={() =>
    setShowMapCinemaId(
      showMapCinemaId === cinema.cinemaId ? null : cinema.cinemaId
    )
  }
>
  {showMapCinemaId === cinema.cinemaId ? 'An' : 'Ban do'}
</button>
```

Y nghia:

- Neu dang chua mo map cua rap do: set `showMapCinemaId = cinema.cinemaId`.
- Neu dang mo map cua rap do: set `showMapCinemaId = null`.
- Chi rap nao co `showMapCinemaId === cinema.cinemaId` moi render `CinemaMap`.

Doan render map:

```js
{showMapCinemaId === cinema.cinemaId && (
  <CinemaMap
    cinemaLat={cinema.latitude}
    cinemaLng={cinema.longitude}
    cinemaName={cinema.name}
  />
)}
```

Cach debug:

1. Dat breakpoint o `onClick` cua nut ban do.
2. Bam nut `Ban do` tren 1 rap.
3. Xem gia tri:
   - `cinema.cinemaId`
   - `cinema.latitude`
   - `cinema.longitude`
   - `showMapCinemaId`
4. Step qua `setShowMapCinemaId`.
5. React render lai, `CinemaMap` duoc mount.

Neu bam nut ma khong thay map:

- Check `showMapCinemaId` co doi khong.
- Check `cinema.latitude` va `cinema.longitude` co gia tri khong.
- Check console co loi Leaflet khong.

## 6. Debug CinemaMap render ban do

Mo file:

```text
Web_Customer/src/components/CinemaMap/CinemaMap.jsx
```

Component nhan props:

```js
export default function CinemaMap({ cinemaLat, cinemaLng, cinemaName })
```

No tao toa do rap:

```js
const cinemaPos = {
    lat: Number(cinemaLat),
    lng: Number(cinemaLng)
};
```

Dat breakpoint ngay sau do va xem:

```js
cinemaLat
cinemaLng
cinemaName
cinemaPos
```

Gia tri dung la:

```js
cinemaPos.lat = so hop le
cinemaPos.lng = so hop le
```

Vi du:

```js
{ lat: 10.7769, lng: 106.7009 }
```

Neu ra:

```js
{ lat: NaN, lng: NaN }
```

thi du lieu rap thieu hoac field sai ten.

## 7. Debug xin quyen lay vi tri hien tai

Trong `CinemaMap.jsx` co `useEffect` dau tien:

```js
useEffect(() => {
    if (!navigator.geolocation) {
        console.log("Trinh duyet khong ho tro Geolocation");
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
            console.log("Khong lay duoc vi tri:", error);
        }
    );
}, []);
```

Y nghia:

1. Browser kiem tra co ho tro geolocation khong.
2. Browser hien popup xin quyen lay vi tri.
3. Neu ban bam `Allow`, callback success chay.
4. `setUserPos` luu vi tri nguoi dung.
5. Khi `userPos` co gia tri, effect thu 2 moi goi MapService.

Cach debug:

1. Dat breakpoint trong callback success:

```js
(position) => {
    setUserPos({
        lat: position.coords.latitude,
        lng: position.coords.longitude
    });
}
```

2. Reload trang `/cinemas`.
3. Bam `Ban do`.
4. Browser se hoi quyen vi tri.
5. Bam `Allow`.
6. Debugger dung, xem:

```js
position.coords.latitude
position.coords.longitude
```

Neu ban bam `Block`:

- `userPos` se van la `null`.
- Ban do chi hien marker rap, khong co marker cua ban.
- Khong co request `/api/map/directions`, vi effect thu 2 co dong:

```js
if (!userPos) return;
```

## 8. Neu lo bam Block vi tri thi mo lai quyen nhu the nao

Tren Chrome:

1. Nhin ben trai thanh dia chi, bam icon cai khoa hoac icon settings.
2. Tim `Location`.
3. Doi thanh `Allow`.
4. Reload trang.
5. Bam lai `Ban do`.

Hoac:

1. Vao `chrome://settings/content/location`.
2. Tim site localhost cua ban.
3. Xoa permission cu.
4. Reload trang va cap quyen lai.

## 9. Debug request lay duong di frontend -> MapServiceNode

`useEffect` thu 2 trong `CinemaMap.jsx`:

```js
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
            console.log("Loi khi goi MapService:", error);
        });
}, [userPos, cinemaPos.lat, cinemaPos.lng]);
```

Dat breakpoint o dong tao `apiUrl`.

Khi debugger dung, xem:

```js
userPos
cinemaPos
apiUrl
```

URL dung se co dang:

```text
http://localhost:5004/api/map/directions?lat1=10.x&lon1=106.x&lat2=10.y&lon2=106.y
```

Mo tab Network:

1. Chon `Fetch/XHR`.
2. Tim request `directions`.
3. Click vao request.
4. Tab `Headers`: xem query string.
5. Tab `Response`: xem co `routes` khong.

Response dung tu OSRM se co dang:

```json
{
  "code": "Ok",
  "routes": [
    {
      "geometry": {
        "coordinates": [
          [106.7, 10.7],
          [106.71, 10.71]
        ]
      }
    }
  ]
}
```

Chu y OSRM tra coordinate theo thu tu:

```text
[longitude, latitude]
```

Leaflet can:

```text
[latitude, longitude]
```

Nen code map lai:

```js
const path = data.routes[0].geometry.coordinates.map(
    (point) => [point[1], point[0]]
);
```

Sau do:

```js
setRoutePath(path);
```

va render:

```js
<Polyline positions={routePath} color="blue" weight={5} />
```

## 10. Debug backend Node MapService

Mo file:

```text
MapServiceNode/server.js
```

Route chinh:

```js
app.get('/api/map/directions', async (req, res) => {
    try {
        const { lat1 ,lon1, lat2, lon2 } = req.query;

        if(!lat1 || !lon1 || !lat2 || !lon2) {
            return res.status(400).json({
                error: 'Thieu thong tin toa do'
            });
        }

        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;

        const response = await axios.get(osrmUrl, {
            headers: {
                'User-Agent': 'CineMiuApp/1.0'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('Loi goi API ban do:', error.message);

        res.status(500).json({
            error: 'Loi server khi lay duong di'
        });
    }
});
```

### Cach test backend rieng truoc khi test frontend

Mo browser hoac Postman goi:

```text
http://localhost:5004/
```

Neu service chay dung, thay:

```text
Map Service is running
```

Goi route directions:

```text
http://localhost:5004/api/map/directions?lat1=10.7769&lon1=106.7009&lat2=10.7626&lon2=106.6602
```

Neu OK, response co:

```json
{
  "code": "Ok",
  "routes": [...]
}
```

### Breakpoint backend Node trong VS Code

1. Mo folder `MapServiceNode`.
2. Mo file `server.js`.
3. Dat breakpoint tai dong:

```js
const { lat1 ,lon1, lat2, lon2 } = req.query;
```

4. Dat them breakpoint tai:

```js
const response = await axios.get(osrmUrl, ...)
```

5. Chay Node debugger cho `server.js`.
6. Quay lai browser, bam nut `Ban do`.
7. Khi request den, debugger dung.
8. Xem:

```js
req.query
lat1
lon1
lat2
lon2
osrmUrl
response.data.routes.length
```

### Cach doc loi backend Node

Neu thieu toa do:

```json
{
  "error": "Thieu thong tin toa do"
}
```

Status code:

```text
400
```

Nguyen nhan:

- Rap thieu `latitude` hoac `longitude`.
- Frontend truyen sai prop.

Neu OSRM loi hoac mat mang:

```json
{
  "error": "Loi server khi lay duong di"
}
```

Status code:

```text
500
```

Nguyen nhan:

- May khong co internet.
- OSRM public API dang loi.
- Toa do khong hop le.

## 11. Debug backend C# lay danh sach rap

Phan ban do can `latitude` va `longitude`, nen phai debug tu API danh sach rap neu map khong hien.

Request frontend:

```text
GET /api/cinemas
```

Di qua:

```text
CinemasPage.jsx
  -> cinemaApi.getAll()
  -> Web_Customer/src/services/api.js request()
  -> /api/cinemas
  -> API_Gateway
  -> API_Service
  -> CinemaController
  -> CinemaService
  -> CinemaRepository
  -> SQL Server
```

Can dat breakpoint:

1. `API_Service/Controllers/CinemaController.cs`
2. `Services/Theater/CinemaService.cs`
3. `Repository/EFCore/Theater/CinemaRepository.cs`

Can kiem tra:

- API co tra `latitude`, `longitude` khong.
- Entity/database co cot toa do khong.
- DTO response co map toa do ra frontend khong.
- Ten field frontend dang dung la `cinema.latitude` va `cinema.longitude`.

Neu backend tra `Latitude`, `Longitude` chu hoa, frontend hien tai dung:

```js
cinema.latitude
cinema.longitude
```

thi prop se bi `undefined`. Khi do map khong render. Can normalize data hoac dung them fallback:

```js
cinemaLat={cinema.latitude ?? cinema.Latitude}
cinemaLng={cinema.longitude ?? cinema.Longitude}
```

## 12. Debug Leaflet hien ban do

Trong `CinemaMap.jsx` co:

```js
<MapContainer center={cinemaPos} zoom={13} className="cinema-map">
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  <Marker position={cinemaPos}>
    <Popup>{cinemaName}</Popup>
  </Marker>
</MapContainer>
```

CSS:

```css
.cinema-map-wrapper{
    width: 100%;
    height: 350px;
    margin-top: 16px;
}

.cinema-map{
    width: 100%;
    height: 100%;
}
```

Neu map khong thay nhung khong co loi:

1. Inspect element.
2. Tim `.cinema-map-wrapper`.
3. Xem height co phai 350px khong.
4. Tim `.leaflet-container`.
5. Neu height = 0 thi loi CSS.

Neu map hien o xam/trang:

1. Network loc `tile.openstreetmap`.
2. Xem tile co status 200 khong.
3. Neu tile bi block, co the do mang hoac ad blocker.

Neu marker khong hien:

1. Kiem tra icon URL trong Network:

```text
marker-icon.png
marker-shadow.png
```

2. Code da fix icon Leaflet bang:

```js
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});
```

## 13. Thu tu debug tu dau den cuoi cho nguoi moi

Lam dung thu tu nay:

1. Chay API_Service.
2. Chay Web_Customer.
3. Chay MapServiceNode.
4. Mo `http://localhost:5173/cinemas`.
5. Mo DevTools -> Network -> Fetch/XHR.
6. Reload trang.
7. Tim `GET /api/cinemas`.
8. Xem response co danh sach rap khong.
9. Xem moi rap co `latitude`, `longitude` khong.
10. Dat breakpoint o `CinemasPage.jsx` dong `.then(setCinemas)`.
11. Reload de xem data vao state.
12. Bam nut `Ban do`.
13. Dat breakpoint o `setShowMapCinemaId`.
14. Xem `showMapCinemaId` co doi thanh cinemaId khong.
15. Dat breakpoint trong `CinemaMap.jsx` ngay sau `cinemaPos`.
16. Xem `cinemaPos.lat`, `cinemaPos.lng`.
17. Browser hoi quyen vi tri thi bam `Allow`.
18. Dat breakpoint trong callback `getCurrentPosition`.
19. Xem `userPos`.
20. Dat breakpoint tai dong tao `apiUrl`.
21. Xem URL goi `localhost:5004`.
22. Network tim request `directions`.
23. Xem response co `routes` khong.
24. Dat breakpoint backend Node trong `MapServiceNode/server.js`.
25. Bam lai `Ban do` hoac reload de request chay lai.
26. Xem `req.query`.
27. Xem `osrmUrl`.
28. Xem `response.data.routes`.
29. Quay lai frontend, xem `routePath`.
30. Neu `routePath.length > 0`, ban do se ve duong blue polyline.

## 14. Cac loi thuong gap va cach tim

### Loi 1: Trang rap khong co du lieu

Dau hieu:

- Man hinh rong hoac khong co card rap.
- Network `/api/cinemas` loi.

Can check:

- API_Service co chay khong.
- Gateway/proxy co dung khong.
- Controller C# co nhan request khong.
- Database co rap khong.

### Loi 2: Bam Ban do nhung khong hien ban do

Dau hieu:

- Khong co map container.
- Khong co request directions.

Can check:

- `showMapCinemaId` co doi khong.
- `cinema.latitude`, `cinema.longitude` co undefined khong.
- `cinemaPos.lat`, `cinemaPos.lng` co `NaN` khong.

### Loi 3: Ban do hien marker rap nhung khong co duong di

Dau hieu:

- Co map.
- Co marker rap.
- Khong co marker vi tri cua ban.
- Khong co duong xanh.

Can check:

- Ban da cap quyen location chua.
- `userPos` co null khong.
- Browser co chan geolocation do HTTP khong. Thu dung `localhost`, vi `localhost` thuong duoc xem la secure context.

### Loi 4: Co vi tri nguoi dung nhung request directions loi

Dau hieu:

- Network `directions` status 500.

Can check:

- MapServiceNode co chay port 5004 khong.
- Terminal node co log loi gi.
- May co internet khong.
- OSRM URL mo truc tiep co tra route khong.

### Loi 5: Response co routes nhung khong ve duong

Dau hieu:

- Network response co `routes`.
- Tren map khong co polyline.

Can check:

- `data.routes[0].geometry.coordinates` co ton tai khong.
- `path` sau map co dang `[lat, lng]` khong.
- `routePath.length` co > 0 khong.

### Loi 6: Goi qua gateway `/api/map/directions` khong vao Node

Trong `ocelot.json` co route:

```text
/api/{everything} -> 5001
/api/map/{everything} -> 5004
```

Route catch-all `/api/{everything}` dang nam truoc route map. Neu goi qua gateway va bi day ve API_Service, hay kiem tra thu tu/priority route. Hien tai frontend goi thang `localhost:5004`, nen khong bi loi nay trong luong `CinemaMap.jsx`.

## 15. Bai tap luyen debug

### Bai 1: Debug thanh cong tu dau den cuoi

Muc tieu:

- Hien card rap.
- Bam ban do.
- Cap quyen location.
- Thay marker rap, marker nguoi dung, va duong di mau xanh.

Can chup/ghi lai:

- Response `/api/cinemas`.
- `cinemaPos`.
- `userPos`.
- `apiUrl`.
- Response `/api/map/directions`.
- `routePath.length`.

### Bai 2: Gia lap thieu toa do rap

Lam:

1. Tam thoi chon 1 rap co `latitude` hoac `longitude` null trong DB, hoac quan sat rap nao thieu toa do.
2. Bam `Ban do`.

Ket qua mong doi:

- `CinemaMap` return null.
- Khong goi MapServiceNode.

Ket luan:

- Ban do phu thuoc vao toa do rap.

### Bai 3: Gia lap khong cap quyen location

Lam:

1. Reload trang.
2. Bam `Ban do`.
3. Khi browser hoi location, bam `Block`.

Ket qua mong doi:

- Co the van hien marker rap.
- Khong co route.
- Console log "Khong lay duoc vi tri".

Ket luan:

- `userPos` la dieu kien de goi backend lay duong di.

### Bai 4: Gia lap MapServiceNode tat

Lam:

1. Tat MapServiceNode.
2. Reload trang.
3. Bam `Ban do`.
4. Cap quyen location.

Ket qua mong doi:

- Network request `localhost:5004/api/map/directions` bi fail.
- Console log "Loi khi goi MapService".

Ket luan:

- Frontend map render duoc, nhung duong di phu thuoc backend Node.

## 16. Ghi nho ngan gon

Neu map khong hien, hoi 5 cau nay theo thu tu:

1. `/api/cinemas` co tra rap khong?
2. Rap co `latitude`, `longitude` khong?
3. Bam nut co set `showMapCinemaId` khong?
4. Browser co lay duoc `userPos` khong?
5. `MapServiceNode` co tra `routes` khong?

Tra loi duoc 5 cau nay la ban nam duoc luong xem ban do cua `CinemasPage`.
