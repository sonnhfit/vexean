# Customer Notifications Backend API

Tài liệu này mô tả API cho tab **Thông báo** ở giao diện khách hàng. Mục tiêu là backend gửi và quản lý thông báo riêng theo từng customer, thay thế dữ liệu mock trong `CustomerNotificationsScreen`.

## Bối Cảnh Frontend

Màn thông báo hiện có:

- Header `Thông báo`.
- Hai nhóm nội dung: `Chuyến đi` và `Khuyến mãi`.
- Badge số lượng chưa đọc trên từng nhóm.
- Mỗi notification có icon, màu, title, message, thời gian và trạng thái unread.
- Khi user chưa đăng nhập, app hiển thị trạng thái yêu cầu đăng nhập.

## Nguyên Tắc Chung

- Các API cá nhân hóa bắt buộc JWT:

```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

- Backend xác định customer từ token, frontend không truyền `customer_id`.
- DateTime dùng ISO 8601, ví dụ `2026-06-18T09:30:00+07:00`.
- Response trả JSON.
- `id` phải ổn định để frontend key/render.
- Không hard-delete notification của user nếu cần audit; nên soft-delete bằng `archived_at` hoặc `deleted_at`.

## Notification Model

Backend nên lưu tối thiểu các field:

| Field | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `id` | number/string | Yes | ID notification. |
| `customer_id` | number | Yes | User/customer nhận thông báo, lấy từ backend. |
| `category` | string | Yes | `trip`, `promotion`, `system`, `payment`. UI hiện dùng chính `trip` và `promotion`. |
| `type` | string | Yes | Loại nghiệp vụ, ví dụ `ticket_confirmed`, `pickup_reminder`, `payment_success`, `promo`. |
| `title` | string | Yes | Tiêu đề ngắn. |
| `message` | string | Yes | Nội dung mô tả. |
| `icon` | string | No | Ionicons name cho app, ví dụ `ticket-outline`. |
| `color` | string | No | Hex color, ví dụ `#2f6f5e`. |
| `read_at` | datetime/null | Yes | `null` nghĩa là chưa đọc. |
| `created_at` | datetime | Yes | Thời điểm tạo. |
| `data` | object | No | Payload điều hướng/metadata. |

Gợi ý category:

| Category | Tab UI | Ví dụ |
| --- | --- | --- |
| `trip` | Chuyến đi | giữ chỗ, đổi giờ, nhắc đón, hủy chuyến |
| `promotion` | Khuyến mãi | mã giảm giá, ưu đãi tuyến |
| `payment` | Chuyến đi | thanh toán thành công/thất bại |
| `system` | Chuyến đi hoặc nhóm riêng sau này | bảo trì, tài khoản |

## 1. Lấy Danh Sách Thông Báo

### `GET /api/nhaxe/customer/notifications/`

Lấy danh sách thông báo của customer đang đăng nhập.

Query params:

| Param | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `category` | string | No | `trip`, `promotion`, `payment`, `system`. Bỏ trống để lấy tất cả. |
| `unread` | boolean | No | `true` chỉ lấy chưa đọc, `false` chỉ lấy đã đọc. |
| `limit` | number | No | Mặc định `20`, tối đa `100`. |
| `offset` | number | No | Mặc định `0`. |

Response:

```json
{
  "count": 24,
  "limit": 20,
  "offset": 0,
  "unread_counts": {
    "trip": 2,
    "promotion": 1,
    "payment": 0,
    "system": 0,
    "total": 3
  },
  "results": [
    {
      "id": 101,
      "category": "trip",
      "type": "ticket_confirmed",
      "title": "Vé Hà Nội - Sa Pa đã được giữ chỗ",
      "message": "HK BUSLINES khởi hành 23:45 hôm nay. Vui lòng có mặt trước 20 phút.",
      "icon": "ticket-outline",
      "color": "#2f6f5e",
      "read_at": null,
      "created_at": "2026-06-18T09:30:00+07:00",
      "data": {
        "ticket_id": 99,
        "trip_id": 7,
        "route_name": "Hà Nội - Sa Pa",
        "departure_time": "2026-06-18T23:45:00+07:00"
      }
    },
    {
      "id": 102,
      "category": "promotion",
      "type": "promo",
      "title": "Ưu đãi tuyến Sa Pa",
      "message": "Giảm 50%, tối đa 250k cho một số khung giờ tối nay.",
      "icon": "pricetag-outline",
      "color": "#d9a94f",
      "read_at": null,
      "created_at": "2026-06-18T07:30:00+07:00",
      "data": {
        "promo_code": "SAPA50",
        "route_id": 31,
        "expires_at": "2026-06-18T23:59:59+07:00"
      }
    }
  ]
}
```

Frontend mapping:

- `category = trip` hiển thị trong nhóm `Thông báo chuyến đi`.
- `category = promotion` hiển thị trong nhóm `Khuyến mãi`.
- `read_at === null` thì hiển thị unread dot.
- `unread_counts.trip` và `unread_counts.promotion` dùng cho badge.
- `created_at` frontend format thành `5 phút trước`, `Hôm qua`, hoặc ngày cụ thể.

## 2. Lấy Tổng Số Chưa Đọc

### `GET /api/nhaxe/customer/notifications/unread-counts/`

Endpoint nhẹ để app refresh badge mà không cần tải cả danh sách.

Response:

```json
{
  "trip": 2,
  "promotion": 1,
  "payment": 0,
  "system": 0,
  "total": 3,
  "updated_at": "2026-06-18T09:31:00+07:00"
}
```

## 3. Đánh Dấu Một Thông Báo Đã Đọc

### `PATCH /api/nhaxe/customer/notifications/{notification_id}/read/`

Đánh dấu một notification của customer đang đăng nhập là đã đọc.

Response:

```json
{
  "id": 101,
  "read_at": "2026-06-18T09:35:00+07:00"
}
```

Ghi chú:

- Nếu notification không thuộc customer hiện tại, trả `404`.
- Nếu đã đọc rồi, vẫn trả `200` với `read_at` hiện tại trong database.

## 4. Đánh Dấu Tất Cả Đã Đọc

### `POST /api/nhaxe/customer/notifications/mark-all-read/`

Body optional:

```json
{
  "category": "trip"
}
```

Nếu không truyền `category`, đánh dấu tất cả notification của customer là đã đọc.

Response:

```json
{
  "updated_count": 2,
  "read_at": "2026-06-18T09:36:00+07:00",
  "unread_counts": {
    "trip": 0,
    "promotion": 1,
    "payment": 0,
    "system": 0,
    "total": 1
  }
}
```

## 5. Ẩn/Xóa Thông Báo Khỏi App

### `DELETE /api/nhaxe/customer/notifications/{notification_id}/`

Soft-delete notification khỏi danh sách của customer.

Response:

```json
{
  "id": 101,
  "deleted_at": "2026-06-18T09:37:00+07:00"
}
```

## 6. Đăng Ký Thiết Bị Nhận Push

### `POST /api/nhaxe/customer/notification-devices/`

Dùng khi backend cần push notification qua FCM/APNs.

Request:

```json
{
  "device_token": "fcm_or_apns_token",
  "platform": "ios",
  "device_id": "A1B2C3D4",
  "app_version": "1.0.0"
}
```

Field:

| Field | Type | Required | Mô tả |
| --- | --- | --- | --- |
| `device_token` | string | Yes | Token từ FCM/APNs. |
| `platform` | string | Yes | `ios`, `android`. |
| `device_id` | string | No | ID thiết bị do app cung cấp. |
| `app_version` | string | No | Version app. |

Response:

```json
{
  "id": 12,
  "platform": "ios",
  "active": true,
  "created_at": "2026-06-18T09:40:00+07:00"
}
```

## 7. Hủy Đăng Ký Thiết Bị

### `DELETE /api/nhaxe/customer/notification-devices/{device_id}/`

Response:

```json
{
  "id": 12,
  "active": false,
  "deactivated_at": "2026-06-18T09:45:00+07:00"
}
```

## 8. Backend Tạo Notification Khi Nào

Backend nên tạo notification theo các event nghiệp vụ:

| Event | Category | Type | Gợi ý nội dung |
| --- | --- | --- | --- |
| Đặt vé/giữ chỗ thành công | `trip` | `ticket_confirmed` | Vé `{route_name}` đã được giữ chỗ |
| Trước giờ đón 30-60 phút | `trip` | `pickup_reminder` | Xe sẽ đón tại `{pickup_name}` lúc `{departure_time}` |
| Thanh toán thành công | `payment` | `payment_success` | Đơn hàng `{order_code}` đã được thanh toán |
| Thanh toán thất bại | `payment` | `payment_failed` | Thanh toán chưa thành công, vui lòng thử lại |
| Đổi giờ/hủy chuyến | `trip` | `trip_updated` / `trip_cancelled` | Chuyến `{route_name}` có thay đổi |
| Có ưu đãi phù hợp tuyến hay đi | `promotion` | `promo` | Giảm giá tuyến `{route_name}` |

`payment` có thể được trả trong tab `Chuyến đi` ở UI hiện tại, hoặc frontend có thể tách tab riêng sau này.

## 9. Payload Điều Hướng

`data` nên đủ để frontend mở đúng màn khi khách bấm notification.

Ví dụ notification vé:

```json
{
  "data": {
    "screen": "CustomerOrders",
    "ticket_id": 99,
    "trip_id": 7,
    "order_code": "VX240617"
  }
}
```

Ví dụ notification khuyến mãi:

```json
{
  "data": {
    "screen": "CustomerHome",
    "promo_code": "SAPA50",
    "origin_id": 1,
    "destination_id": 8,
    "travel_date": "2026-06-19"
  }
}
```

## 10. Error Response

Unauthorized:

```json
{
  "detail": "Authentication credentials were not provided."
}
```

Not found:

```json
{
  "detail": "Notification not found."
}
```

Validation error:

```json
{
  "category": ["Category is invalid."]
}
```

## Gợi Ý Triển Khai Database

Table `customer_notifications`:

- `id`
- `customer_id`
- `category`
- `type`
- `title`
- `message`
- `icon`
- `color`
- `data` JSON
- `read_at`
- `created_at`
- `updated_at`
- `deleted_at`

Index nên có:

- `(customer_id, deleted_at, created_at)`
- `(customer_id, category, read_at)`
- `(customer_id, read_at)`

Table `customer_notification_devices`:

- `id`
- `customer_id`
- `device_token`
- `platform`
- `device_id`
- `app_version`
- `active`
- `created_at`
- `updated_at`
- `deactivated_at`

