# BE-SQL

Backend TypeScript trên CloudFlare Workers để kết nối MySQL và phục vụ web panel.

## Mô tả

Dự án backend serverless sử dụng TypeScript, chạy trên CloudFlare Workers. Cung cấp API cho MySQL, xác thực bằng cookie mã hóa, quản lý khóa người dùng.

## Tính năng

- Backend serverless với CloudFlare Workers.
- TypeScript cho an toàn kiểu dữ liệu.
- Kết nối MySQL.
- Xác thực bằng cookie phiên mã hóa AES-GCM.
- Quản lý khóa API.
- Hỗ trợ CORS.

## Yêu cầu

- Biến môi trường:
  - `SESSION_SECRET`: Khóa bí mật mạnh (≥32 ký tự).
  - `URL_API_SQL`: URL MySQL.

## Cài đặt

1. Clone: `git clone <url> && cd be-sql`
2. Cài đặt: `npm install`
3. Thiết lập `.env`:
   ```
   SESSION_SECRET
   URL_API_SQL
   ```
4. Chạy: `npm run dev` (local) hoặc `npm run deploy`.

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /check-env | Kiểm tra biến môi trường |
| GET | /check-db | Kiểm tra kết nối DB |
| POST | /register | Đăng ký user |
| POST | /login | Đăng nhập (set cookie) |
| GET | /logout | Đăng xuất (xóa cookie) |
| GET | /get-key | Liệt kê khóa (auth) |
| POST | /add-key | Thêm khóa (auth) |
| POST | /delete-key | Xóa khóa (auth) |
| GET | /get-info | Lấy thông tin user (auth) |
| POST | /reset-key | Reset khóa (auth) |
| POST | /login-client | Login với key và id_device |

## Xác thực

Cookie HttpOnly, Secure, SameSite=None. Mã hóa AES-GCM. Logout xóa cookie.

## Tác giả

abxST
