# GIT WORKFLOW – CARAVESO

Quy trình làm việc chung của nhóm trên GitHub. Mỗi thay đổi đều truy vết được về mã yêu cầu (FR, PA, MA, OA, AD) trong tài liệu Requirements.

---

## 1. Nhánh

| Nhánh | Mục đích | Quy tắc |
| :-- | :-- | :-- |
| `main` | Bản ổn định dùng để demo, nộp | Không push trực tiếp. Chỉ merge từ `develop` khi hoàn thành một mốc, gắn tag |
| `develop` | Nhánh tích hợp | Không push trực tiếp. Chỉ merge qua Pull Request |
| `feature/<mã>-<mô-tả>` | Làm chức năng mới | Tách từ `develop`, merge lại vào `develop` |
| `fix/<mã>-<mô-tả>` | Sửa lỗi | Như trên |
| `docs/<mô-tả>` | Sửa tài liệu | Như trên |

Ví dụ tên nhánh: `feature/fr-30-apply-voucher`, `fix/fr-38-webhook-duplicate`, `docs/update-api-design`.

Quy tắc đặt tên nhánh: chữ thường, tiếng Anh, nối bằng gạch ngang, nên có mã FR. Một nhánh làm một việc, sống ngắn (vài ngày), merge xong thì xóa.

---

## 2. Commit

Theo Conventional Commits, kèm mã FR:

```
<loại>(<phạm vi>): <mã FR> <mô tả ngắn>
```

| Loại | Dùng khi |
| :-- | :-- |
| `feat` | Thêm chức năng |
| `fix` | Sửa lỗi |
| `docs` | Sửa tài liệu |
| `refactor` | Sửa cấu trúc code, không đổi hành vi |
| `style` | Định dạng, không đổi logic |
| `test` | Thêm hoặc sửa test |
| `chore` | Cấu hình, thư viện, việc lặt vặt |

Phạm vi là tên module hoặc app: `cart`, `orders`, `auth`, `customer-web`, `admin-web`, `server`.

Ví dụ:

```
feat(cart): FR-30 áp dụng voucher tại giỏ hàng
fix(payments): FR-38 chống xử lý trùng giao dịch webhook
docs(api): cập nhật mã lỗi PROMOTION_CONFLICT
```

Mỗi commit làm một việc, mô tả ngắn gọn, viết thống nhất bằng một ngôn ngữ (đề xuất tiếng Việt cho mô tả, tiếng Anh cho loại và phạm vi).

---

## 3. Quy trình làm một việc

1. Chọn hoặc tạo **Issue** có tiêu đề `[FR-xx] Tên chức năng`, gán người làm.
2. Cập nhật `develop`: `git checkout develop && git pull`.
3. Tạo nhánh: `git checkout -b feature/fr-30-apply-voucher`.
4. Code, commit nhỏ và thường xuyên. Định kỳ `git pull --rebase origin develop` để bớt xung đột.
5. Chạy `npm run lint` và build trước khi đẩy.
6. Push và tạo **Pull Request** vào `develop`.
7. Có ít nhất **1 người review** (không tự duyệt PR của mình). Sửa theo góp ý.
8. Merge bằng **Squash and merge**, thông điệp commit theo quy ước mục 2, rồi xóa nhánh.

---

## 4. Pull Request

Mẫu PR (`.github/pull_request_template.md`):

```markdown
## Mô tả
<!-- Làm gì, vì sao -->

## Yêu cầu liên quan
<!-- Ví dụ: FR-30, MA-04. Closes #12 -->

## Cách kiểm tra
<!-- Các bước để người review chạy thử -->

## Checklist
- [ ] Đã chạy lint và build thành công
- [ ] Đã chạy thử chức năng trên máy
- [ ] Nếu đổi endpoint, field hoặc mã lỗi: đã sửa API Design và Database Design
- [ ] Không có file `.env`, key, `uploads/` trong commit
```

PR nên nhỏ (dưới khoảng 400 dòng thay đổi), một PR một chức năng.

---

## 5. Thay đổi tài liệu và hợp đồng API

- Sửa endpoint, field, mã lỗi hoặc collection: **sửa `docs/api-design.md` hoặc `docs/database-design.md` trong cùng PR** với code, và ghi "Lịch sử thay đổi".
- Thay đổi ảnh hưởng cả Angular và Express thì báo trong nhóm trước khi merge để hai bên cập nhật cùng lúc.

---

## 6. Các việc không được làm

- Không push trực tiếp vào `main` và `develop`.
- Không `git push --force` lên nhánh dùng chung (`main`, `develop`).
- Không commit `.env`, API key, `node_modules`, `uploads/`, file build (`dist/`).
- Không merge PR khi lint hoặc build đang lỗi.

`.gitignore` tối thiểu: `node_modules/`, `dist/`, `.angular/`, `.env`, `uploads/`, `*.log`.

---

## 7. Phát hành mốc

Khi hoàn thành một mốc (demo giữa kỳ, nộp cuối kỳ): merge `develop` vào `main` bằng PR, gắn tag (`v0.1.0`, `v1.0.0`) và ghi các chức năng đã xong (liệt kê mã FR).
