# Customer Home Backend API

Tài liệu này mô tả các API nên có cho HomeScreen của customer trong app Vexean. Mục tiêu là thay thế dữ liệu mock hiện tại bằng dữ liệu từ backend, hỗ trợ pull-to-refresh, tìm kiếm chuyến, tuyến phổ biến và lịch sử tìm kiếm gần đây.

## Bối Cảnh Frontend

Màn `CustomerHomeScreen` hiện có các khối dữ liệu:

- Thông tin hero/app brand và trạng thái đăng nhập.
- Loại dịch vụ: xe khách, limousine, ghế ngồi, giường nằm.
- Form tìm kiếm: điểm đi, điểm đến, ngày đi, khứ hồi.
- Tìm kiếm gần đây.
- Tuyến đường phổ biến.
- Các benefit ngắn: chắc chắn có chỗ, hỗ trợ 24/7, ưu đãi, thanh toán.

Các API hiện tại trong app đang dùng prefix `/api/nhaxe/odoo/...` và gọi qua `requestJson(..., { auth: true })`, tức là backend nên hỗ trợ Bearer token nếu endpoint cần cá nhân hóa theo user.

## Nguyên Tắc Chung

- Response trả JSON, header `Content-Type: application/json`.
- Endpoint cá nhân hóa user dùng `Authorization: Bearer <access_token>`.
- Date dùng ISO format `YYYY-MM-DD`.
- DateTime dùng ISO 8601, ví dụ `2026-06-16T08:30:00+07:00`.
- Tiền tệ dùng số nguyên VND, không gửi chuỗi có ký hiệu tiền.
- Các list nên có `id` ổn định để frontend key/render.
- Các endpoint GET nên hỗ trợ cache nhẹ bằng `ETag` hoặc `updated_at` nếu backend có thể làm.

## 1. Home Tổng Hợp

### `GET /api/nhaxe/customer/home/`

API tổng hợp để HomeScreen load và pull-to-refresh một lần. Endpoint này nên trả những dữ liệu cần hiển thị ngay ở màn home.

Auth:

- Optional.
- Nếu có token: trả thêm recent searches của user và dữ liệu cá nhân hóa.
- Nếu không có token: vẫn trả default search, popular routes, services, benefits.

Query params:

| Param | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `origin_id` | number | No | Điểm đi đang chọn, dùng để gợi ý destination/popular route phù hợp. |
| `destination_id` | number | No | Điểm đến đang chọn. |
| `travel_date` | string | No | Ngày đi dạng `YYYY-MM-DD`. |
| `limit_recent` | number | No | Số lịch sử tìm kiếm, mặc định `5`. |
| `limit_popular` | number | No | Số tuyến phổ biến, mặc định `10`. |

Response mẫu:

```json
{
  "user": {
    "display_name": "Nguyễn Văn A",
    "phone": "0909000000"
  },
  "default_search": {
    "origin": {
      "id": 1,
      "name": "Hồ Chí Minh",
      "province": "TP. Hồ Chí Minh",
      "slug": "ho-chi-minh"
    },
    "destination": {
      "id": 2,
      "name": "Bà Rịa-Vũng Tàu",
      "province": "Bà Rịa-Vũng Tàu",
      "slug": "ba-ria-vung-tau"
    },
    "travel_date": "2026-06-16",
    "round_trip": false,
    "return_date": null
  },
  "service_types": [
    {
      "id": "coach",
      "label": "Xe khách",
      "icon": "bus",
      "active": true
    },
    {
      "id": "limousine",
      "label": "Limousine",
      "icon": "sparkles-outline",
      "active": true
    },
    {
      "id": "seat",
      "label": "Ghế ngồi",
      "icon": "ticket-outline",
      "active": true
    },
    {
      "id": "sleeper",
      "label": "Giường nằm",
      "icon": "bed-outline",
      "active": true
    }
  ],
  "benefits": [
    {
      "id": "guaranteed-seat",
      "icon": "shield-checkmark",
      "text": "Chắc chắn có chỗ"
    },
    {
      "id": "support",
      "icon": "headset",
      "text": "Hỗ trợ 24/7"
    },
    {
      "id": "deals",
      "icon": "pricetag",
      "text": "Nhiều ưu đãi"
    },
    {
      "id": "payment",
      "icon": "cash",
      "text": "Thanh toán đa dạng"
    }
  ],
  "recent_searches": [
    {
      "id": 101,
      "origin": {
        "id": 1,
        "name": "Hồ Chí Minh"
      },
      "destination": {
        "id": 2,
        "name": "Bà Rịa-Vũng Tàu"
      },
      "travel_date": "2026-06-19",
      "return_date": null,
      "round_trip": false,
      "service_type": "coach",
      "created_at": "2026-06-16T08:30:00+07:00"
    }
  ],
  "popular_routes": [
    {
      "id": 11,
      "origin": {
        "id": 1,
        "name": "Hồ Chí Minh"
      },
      "destination": {
        "id": 3,
        "name": "Đà Lạt"
      },
      "title": "Đà Lạt",
      "subtitle": "Hồ Chí Minh - Đà Lạt",
      "image_url": "https://cdn.example.com/routes/da-lat.jpg",
      "color": "#7b8f76",
      "min_price": 220000,
      "trip_count": 12
    }
  ],
  "meta": {
    "server_time": "2026-06-16T09:00:00+07:00",
    "updated_at": "2026-06-16T08:59:30+07:00"
  }
}
```

Ghi chú triển khai:

- `user` có thể là `null` nếu chưa đăng nhập.
- `recent_searches` trả `[]` nếu chưa đăng nhập hoặc chưa có lịch sử.
- `popular_routes.color` là optional. Nếu backend không muốn quản lý màu, frontend có thể tự fallback.
- `image_url` chưa cần cho UI hiện tại, nhưng nên có để mở rộng card tuyến phổ biến sau này.
- `trip_count` nên tính theo số chuyến còn mở bán trong khoảng ngày gần nhất hoặc theo `travel_date` nếu có truyền.

## 2. Tìm Kiếm Địa Điểm

### `GET /api/nhaxe/odoo/locations/`

Dùng khi frontend cho phép chọn điểm đi/điểm đến thay vì hard-code.

Auth:

- Không bắt buộc.

Query params:

| Param | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `search` | string | No | Từ khóa tìm theo tên tỉnh/thành, bến xe, văn phòng. |
| `type` | string | No | `province`, `station`, `office`, hoặc bỏ trống để lấy tất cả. |
| `active` | boolean | No | Mặc định `true`. |
| `limit` | number | No | Mặc định `20`. |

Response mẫu:

```json
{
  "results": [
    {
      "id": 1,
      "name": "Hồ Chí Minh",
      "province": "TP. Hồ Chí Minh",
      "type": "province",
      "slug": "ho-chi-minh",
      "display_name": "Hồ Chí Minh",
      "active": true
    },
    {
      "id": 21,
      "name": "VP Quận 10",
      "province": "TP. Hồ Chí Minh",
      "type": "office",
      "slug": "vp-quan-10",
      "display_name": "VP Quận 10, TP. Hồ Chí Minh",
      "active": true
    }
  ]
}
```

## 3. Tìm Tuyến Có Chuyến

### `GET /api/nhaxe/odoo/route-search/`

Dùng khi user chọn điểm đi, điểm đến, ngày đi trên home để kiểm tra có tuyến/chuyến phù hợp trước khi chuyển qua màn đặt vé.

Auth:

- Optional. Có token thì có thể trả thêm ưu đãi/user-specific price nếu cần.

Query params:

| Param | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `origin_id` | number | Yes | ID điểm đi. |
| `destination_id` | number | Yes | ID điểm đến. |
| `travel_date` | string | Yes | Ngày đi `YYYY-MM-DD`. |
| `return_date` | string | No | Ngày về nếu khứ hồi. |
| `service_type` | string | No | `coach`, `limousine`, `seat`, `sleeper`. |
| `passengers` | number | No | Mặc định `1`. |

Response mẫu:

```json
{
  "query": {
    "origin_id": 1,
    "destination_id": 2,
    "travel_date": "2026-06-19",
    "return_date": null,
    "service_type": "coach",
    "passengers": 1
  },
  "summary": {
    "available": true,
    "trip_count": 8,
    "min_price": 180000,
    "max_price": 260000
  },
  "routes": [
    {
      "id": 31,
      "name": "Hồ Chí Minh - Bà Rịa-Vũng Tàu",
      "origin": {
        "id": 1,
        "name": "Hồ Chí Minh"
      },
      "destination": {
        "id": 2,
        "name": "Bà Rịa-Vũng Tàu"
      },
      "trip_count": 8,
      "min_price": 180000,
      "first_departure_time": "2026-06-19T06:00:00+07:00",
      "last_departure_time": "2026-06-19T20:00:00+07:00"
    }
  ]
}
```

Frontend flow đề xuất:

1. User nhấn `Tìm kiếm` ở HomeScreen.
2. Frontend gọi `route-search`.
3. Nếu `summary.available = true`, chuyển qua `TicketBooking` kèm query route/date.
4. Nếu không có chuyến, hiển thị empty state hoặc gợi ý ngày khác.

## 4. Lưu Tìm Kiếm Gần Đây

### `POST /api/nhaxe/customer/recent-searches/`

Dùng để lưu lịch sử sau khi user thực hiện search hợp lệ.

Auth:

- Bắt buộc.

Request body:

```json
{
  "origin_id": 1,
  "destination_id": 2,
  "travel_date": "2026-06-19",
  "return_date": null,
  "round_trip": false,
  "service_type": "coach"
}
```

Response mẫu:

```json
{
  "id": 101,
  "origin": {
    "id": 1,
    "name": "Hồ Chí Minh"
  },
  "destination": {
    "id": 2,
    "name": "Bà Rịa-Vũng Tàu"
  },
  "travel_date": "2026-06-19",
  "return_date": null,
  "round_trip": false,
  "service_type": "coach",
  "created_at": "2026-06-16T08:30:00+07:00"
}
```

Ghi chú triển khai:

- Nên upsert theo `user_id + origin_id + destination_id + travel_date + return_date + service_type` để tránh trùng lịch sử.
- Giới hạn lưu khoảng `20` bản ghi gần nhất mỗi user.
- Khi vượt giới hạn, xóa bản ghi cũ nhất.

### `GET /api/nhaxe/customer/recent-searches/`

Auth:

- Bắt buộc.

Query params:

| Param | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `limit` | number | No | Mặc định `10`. |

Response mẫu:

```json
{
  "results": [
    {
      "id": 101,
      "origin": {
        "id": 1,
        "name": "Hồ Chí Minh"
      },
      "destination": {
        "id": 2,
        "name": "Bà Rịa-Vũng Tàu"
      },
      "travel_date": "2026-06-19",
      "return_date": null,
      "round_trip": false,
      "service_type": "coach",
      "created_at": "2026-06-16T08:30:00+07:00"
    }
  ]
}
```

### `DELETE /api/nhaxe/customer/recent-searches/{id}/`

Xóa một lịch sử tìm kiếm.

Auth:

- Bắt buộc.

Response:

```json
{
  "success": true
}
```

### `DELETE /api/nhaxe/customer/recent-searches/`

Xóa tất cả lịch sử tìm kiếm của user hiện tại. Dùng cho nút `Xóa tất cả`.

Auth:

- Bắt buộc.

Response:

```json
{
  "success": true,
  "deleted_count": 5
}
```

## 5. Tuyến Phổ Biến

### `GET /api/nhaxe/odoo/popular-routes/`

Nếu không muốn trả trong API home tổng hợp, có thể tách tuyến phổ biến thành endpoint riêng.

Auth:

- Optional.

Query params:

| Param | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `origin_id` | number | No | Lọc theo điểm đi. |
| `travel_date` | string | No | Tính số chuyến/giá theo ngày. |
| `service_type` | string | No | Lọc loại dịch vụ. |
| `limit` | number | No | Mặc định `10`. |

Response mẫu:

```json
{
  "results": [
    {
      "id": 11,
      "origin": {
        "id": 1,
        "name": "Hồ Chí Minh"
      },
      "destination": {
        "id": 3,
        "name": "Đà Lạt"
      },
      "title": "Đà Lạt",
      "subtitle": "Hồ Chí Minh - Đà Lạt",
      "image_url": "https://cdn.example.com/routes/da-lat.jpg",
      "color": "#7b8f76",
      "min_price": 220000,
      "trip_count": 12,
      "score": 98
    }
  ]
}
```

Gợi ý cách tính `score`:

- Số lượt đặt vé trong 30 ngày gần nhất.
- Số lượt tìm kiếm tuyến.
- Số chuyến còn mở bán.
- Ưu tiên tuyến đang active và còn ghế.

## 6. Cấu Trúc Dữ Liệu Đề Xuất

### `customer_recent_search`

| Field | Type | Ghi chú |
| --- | --- | --- |
| `id` | bigint | Primary key. |
| `user_id` | bigint | User sở hữu lịch sử. |
| `origin_id` | bigint | FK location. |
| `destination_id` | bigint | FK location. |
| `travel_date` | date | Ngày đi. |
| `return_date` | date/null | Ngày về. |
| `round_trip` | boolean | Có khứ hồi hay không. |
| `service_type` | varchar | `coach`, `limousine`, `seat`, `sleeper`. |
| `created_at` | datetime | Thời điểm tạo. |
| `updated_at` | datetime | Thời điểm cập nhật/upsert. |

Index đề xuất:

- `(user_id, updated_at DESC)`
- `(user_id, origin_id, destination_id, travel_date, return_date, service_type)` unique nếu dùng upsert.

### `location`

Nếu backend/Odoo chưa có model location chuẩn, nên chuẩn hóa một bảng hoặc serializer:

| Field | Type | Ghi chú |
| --- | --- | --- |
| `id` | bigint | Primary key. |
| `name` | varchar | Tên ngắn. |
| `province` | varchar | Tỉnh/thành. |
| `type` | varchar | `province`, `station`, `office`. |
| `slug` | varchar | Dùng cho deep link/cache. |
| `active` | boolean | Có cho khách chọn hay không. |

## 7. Mã Lỗi Chuẩn

Backend nên trả error theo format đang tương thích với `requestJson`, ưu tiên field `detail`.

```json
{
  "detail": "Không tìm thấy tuyến phù hợp."
}
```

Status code đề xuất:

| Status | Trường hợp |
| --- | --- |
| `200` | GET thành công. |
| `201` | Tạo recent search thành công. |
| `204` hoặc `200` | Delete thành công. |
| `400` | Thiếu field hoặc query param không hợp lệ. |
| `401` | Endpoint bắt buộc đăng nhập nhưng thiếu token. |
| `403` | User không có quyền thao tác resource. |
| `404` | Không tìm thấy location/recent search. |
| `500` | Lỗi backend/Odoo không mong muốn. |

## 8. Ưu Tiên Triển Khai

Nên triển khai theo thứ tự:

1. `GET /api/nhaxe/customer/home/`
2. `GET /api/nhaxe/odoo/locations/`
3. `GET /api/nhaxe/odoo/route-search/`
4. `POST /api/nhaxe/customer/recent-searches/`
5. `DELETE /api/nhaxe/customer/recent-searches/`
6. `GET /api/nhaxe/odoo/popular-routes/` nếu chưa gộp vào home.

Với phiên bản đầu tiên, chỉ cần endpoint home trả `default_search`, `recent_searches`, `popular_routes`, `service_types`, `benefits` là frontend có thể thay mock data và pull-to-refresh bằng dữ liệu thật.
