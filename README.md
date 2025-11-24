# BDS Manager Pro

Công cụ quản lý bất động sản chuyên nghiệp, đơn giản và hiệu quả.

## Tính năng chính

### Quản lý dữ liệu
- Thêm, sửa, xóa thông tin BĐS dễ dàng
- 10 trường thông tin chi tiết:
  1. STT (tự động)
  2. Chủ nhà
  3. Địa chỉ BĐS
  4. Giá gốc
  5. Giá đăng bán
  6. Nội dung chi tiết đăng
  7. Hình ảnh nhà (link)
  8. Hoa hồng MG
  9. Tình trạng (Đang bán/Đã bán/Chờ)
  10. Clip nhà (link)

### Tìm kiếm & Lọc
- Tìm kiếm theo chủ nhà, địa chỉ
- Lọc theo tình trạng BĐS
- Xem chi tiết từng BĐS

### Thống kê
- Tổng số BĐS
- Số lượng đang bán
- Số lượng đã bán
- Tổng giá trị

### Đồng bộ dữ liệu
- Lưu trữ LocalStorage (tự động)
- Xuất/Nhập file JSON để sync giữa các thiết bị
- Tích hợp Firebase Realtime Database để sync tự động real-time

### Giao diện
- Responsive hoàn hảo cho cả Mobile & Desktop
- Sử dụng Tailwind CSS - dễ customize
- Theme chuyên nghiệp với màu sắc hài hòa

## Hướng dẫn sử dụng

### Cài đặt
1. Mở file `index.html` trên trình duyệt
2. Không cần cài đặt server, chạy trực tiếp

### Sử dụng cơ bản
1. **Thêm BĐS mới**: Click nút "Thêm BĐS" màu xanh lá
2. **Xem chi tiết**: Click vào dòng bất kỳ trong bảng
3. **Sửa**: Click icon bút chì hoặc nút "Chỉnh sửa" trong chi tiết
4. **Xóa**: Click icon thùng rác (sẽ có xác nhận)
5. **Tìm kiếm**: Gõ từ khóa vào ô tìm kiếm
6. **Lọc**: Chọn tình trạng trong dropdown

### Xuất/Nhập dữ liệu
**Xuất dữ liệu:**
- Click nút "Xuất dữ liệu"
- File JSON sẽ được tải về máy
- Tên file: `bds_data_[timestamp].json`

**Nhập dữ liệu:**
- Click nút "Nhập dữ liệu"
- Chọn file JSON đã xuất trước đó
- Chọn "OK" để gộp, "Cancel" để thay thế hoàn toàn

### Cấu hình Google Drive (Khuyên dùng - Miễn phí 15GB)

**Google Drive cho phép:**

- Upload ảnh/video trực tiếp lên Drive của bạn
- Tự động sync dữ liệu JSON
- Quản lý file của chính bạn
- Hoàn toàn miễn phí (15GB)

**Các bước setup (cần tạo CẢ HAI loại credentials):**

1. **Tạo Google Cloud Project:**
   - Truy cập [Google Cloud Console](https://console.cloud.google.com)
   - Click "Select a project" → "New Project"
   - Đặt tên project (VD: "BDS Manager")
   - Click "Create"

2. **Enable Google Drive API:**
   - Vào "APIs & Services" → "Enable APIs and Services"
   - Tìm "Google Drive API"
   - Click "Enable"

3. **Tạo OAuth 2.0 Client ID (để đăng nhập):**
   - Vào "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Nếu chưa có OAuth consent screen, tạo mới:
     - User Type: External
     - App name: BDS Manager
     - User support email: email của bạn
     - Developer contact: email của bạn
     - Save and Continue
   - Application type: **Web application**
   - Name: "BDS Manager Web"
   - Authorized JavaScript origins:
     - `http://localhost` (nếu test local)
     - `https://yourdomain.com` (domain thật của bạn)
   - Click "Create"
   - Copy **Client ID** (dạng: xxx.apps.googleusercontent.com)
   - **KHÔNG** copy Client Secret!

4. **Tạo API Key (để gọi Drive API):**
   - Vào "APIs & Services" → "Credentials"
   - Click "Create Credentials" → **API key** (KHÔNG phải OAuth!)
   - Copy **API Key** (bắt đầu với AIza...)
   - (Optional) Click "Restrict Key" để bảo mật tốt hơn

**Lưu ý quan trọng:**
- Cần **CẢ HAI**: OAuth Client ID + API Key
- Client ID để đăng nhập Google
- API Key để call Drive API
- KHÔNG dùng Client Secret!

5. **Cấu hình trong app:**
   - Mở app, click nút "Đăng nhập Drive"
   - Paste Client ID và API Key vào form
   - Click "Lưu cấu hình"
   - Tải lại trang

6. **Sử dụng:**
   - Click "Đăng nhập Drive" và cho phép quyền truy cập
   - Upload ảnh/video trực tiếp trong form thêm/sửa BĐS
   - Dữ liệu tự động sync vào file `bds_data_backup.json` trên Drive

### Cấu hình Firebase (Tùy chọn - Nếu không dùng Drive)

1. **Tạo Firebase Project:**
   - Truy cập https://console.firebase.google.com
   - Tạo project mới
   - Vào Project Settings > General > Your apps
   - Thêm Web App và copy thông tin config

2. **Cấu hình trong app:**
   - Click icon bánh răng bên cạnh "Firebase Sync"
   - Điền thông tin:
     - API Key
     - Auth Domain
     - Database URL
     - Project ID
   - Click "Lưu cấu hình"

3. **Bật Firebase Sync:**
   - Tick checkbox "Firebase Sync"
   - Dữ liệu sẽ tự động sync real-time giữa các thiết bị

4. **Cấu hình Firebase Database Rules:**
   - Vào Firebase Console > Realtime Database > Rules
   - Đặt rules như sau (cho development):
   ```json
   {
     "rules": {
       "bdsData": {
         ".read": true,
         ".write": true
       }
     }
   }
   ```
   - Lưu ý: Đây là rules mở, trong production nên dùng authentication

## Cấu trúc file

```text
bds_vip_pro_plus_ppp/
├── index.html          # Giao diện chính
├── app.js             # Logic xử lý chính
├── google-drive.js    # Tích hợp Google Drive
└── README.md          # File này
```

## Công nghệ sử dụng

- **HTML5**: Cấu trúc
- **Tailwind CSS**: Framework CSS (CDN)
- **Vanilla JavaScript**: Logic xử lý
- **Google Drive API**: Upload ảnh/video & sync data
- **Firebase**: Sync real-time (optional)
- **LocalStorage**: Lưu trữ local
- **Font Awesome**: Icons

## Tips & Tricks

1. **Upload ảnh/video**: Đăng nhập Google Drive để upload trực tiếp, file lưu vào Drive của bạn
2. **Backup tự động**: Dữ liệu tự động sync vào Drive mỗi khi có thay đổi
3. **Sync đa thiết bị**: Dùng Google Drive hoặc xuất/nhập JSON thủ công
4. **Responsive**: App chạy mượt trên mọi kích thước màn hình
5. **Tìm kiếm nhanh**: Gõ từ khóa để filter ngay lập tức
6. **Click vào dòng**: Xem chi tiết nhanh thay vì phải click nút
7. **Preview trước khi lưu**: Xem trước ảnh/video ngay sau khi upload

## Bảo mật

- Dữ liệu lưu local trên máy (LocalStorage)
- Ảnh/video lưu trên Google Drive của user (họ tự quản lý)
- API credentials nên restrict domain trong production
- Không lưu mật khẩu hoặc thông tin nhạy cảm

## Hỗ trợ

- Email: support@bdsmanager.com
- Issues: Báo lỗi qua GitHub Issues (nếu có repo)

## License

MIT License - Tự do sử dụng và chỉnh sửa

---

**Phát triển bởi**: BDS Manager Pro Team
**Phiên bản**: 1.0.0
**Ngày cập nhật**: 2025
