# Mermaid luồng MoviesController

Mỗi file Mermaid tương ứng một hàm/endpoint trong `API_Service/Controllers/MovieController.cs`:

- `01-get-all.mmd`: `GetAll`
- `02-get-by-id.mmd`: `GetById`
- `03-create.mmd`: `Create`
- `04-update.mmd`: `Update`
- `05-delete.mmd`: `Delete`

Có thể render bằng Mermaid Live Editor hoặc Mermaid CLI:

```powershell
mmdc -i docs/uml/movie-controller/01-get-all.mmd -o get-all.png
```

Các sơ đồ bám theo implementation hiện tại: Controller → Service → Repository → SQL Server, sau đó dữ liệu/kết quả đi ngược về Repository → Service → Controller.
