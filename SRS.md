# เอกสารสเปคความต้องการซอฟต์แวร์ (SRS) — motorbike_project

## 1) บทนำ
- ชื่อระบบ: Motorbike Service Management System
- เป้าหมาย: จัดการการจอง, สถานะซ่อม, บริการ/อะไหล่, การแจ้งเตือน และเชื่อมต่ออัตโนมัติไปยัง Google Drive/Sheets ผ่าน n8n Cloud
- ผู้มีส่วนได้ส่วนเสีย: แอดมินร้าน, ช่าง, ลูกค้า, ผู้ดูแลโครงสร้างพื้นฐาน (Render/Vercel/Supabase/n8n Cloud)

## 2) ขอบเขต
- ลูกค้าสร้างการจอง เลือกบริการ/อะไหล่ ระบุวันเวลา แนบสลิป (ถ้ามี)
- ลูกค้ายกเลิกจากหน้า History โดยต้องกรอกเหตุผล
- แอดมิน/ช่างปรับสถานะงาน แก้ไขรายละเอียด/ราคา วันที่/เวลา
- การยืนยันการจองโดยแอดมินจะส่งข้อมูลไป n8n Cloud เพื่ออัปโหลดสลิป/placeholder และบันทึก Google Sheets
- มีหน้า Dashboard, Notifications, History แยกตามบทบาท

## 3) สถาปัตยกรรม
- Frontend: Next.js 14 + TypeScript + Tailwind (Vercel)
- Backend: Node.js/Express + Socket.IO (Render) 
- Database: Supabase (PostgreSQL, sslmode=require)
- Automation: n8n Cloud (Production Webhook)
- External: Google Drive/Sheets
- Security: JWT ผ่าน Header `x-auth-token`, CORS เฉพาะโดเมนที่อนุญาต, `X-N8N-SECRET`

## 4) บทบาทและสิทธิ์
- admin: จัดการทั้งหมด แก้ไขการจอง/ราคา CRUD บริการ/อะไหล่ ดูสถิติ
- mechanic: ดูงาน อัปเดตสถานะ แก้ไขราคา/หมายเหตุ
- customer: จองคิว ดูสถานะและประวัติของตนเอง ขอ/ยกเลิกการจองพร้อมเหตุผล

## 5) ความต้องการเชิงหน้าที่
Authentication
- สมัคร/เข้าสู่ระบบด้วยอีเมล+รหัสผ่าน ออก/ตรวจ JWT

Booking
- สร้างการจอง: วันที่ เวลา บริการ อะไหล่ หมายเหตุ วิธีชำระ (promptpay/shop) แนบสลิป
- ตรวจสอบสล็อตเวลาว่างก่อนบันทึก
- แอดมิน/ช่างแก้ไขการจอง (วันที่/เวลา/หมายเหตุ/ราคา) และเปลี่ยนสถานะ
- เมื่อสถานะเป็น `confirmed` ส่งข้อมูลไป n8n Cloud เพื่ออัปโหลดไฟล์และบันทึก Sheets

Cancel Flow
- ลูกค้ากดยกเลิกจากหน้า History จะต้องระบุเหตุผลใน Modal
- เรียก `PUT /api/bookings/:id/cancel` พร้อม `{ reason }`
- กรณีสถานะปัจจุบันเป็น `pending` → เปลี่ยนเป็น `cancelled` ทันทีและแจ้งเตือนแอดมิน
- กรณีสถานะเป็น `confirmed` → เปลี่ยนเป็น `cancel_requested` และแจ้งเตือนแอดมินเพื่อพิจารณา
- เหตุผลจะถูกบันทึกเพิ่มใน `notes` โดยเติมบรรทัด “คำขอยกเลิกโดยลูกค้า: …”
- ปุ่ม “ยืนยันยกเลิก” อยู่ที่หน้า Notifications ของแอดมิน (นำออกจากหน้า Admin Bookings)

Inventory & Services
- จัดการบริการ (CRUD, admin) พร้อมราคา/ระยะเวลา
- จัดการอะไหล่ (CRUD) พร้อมราคา/จำนวนขั้นต่ำ และตัดสต็อกเมื่อผูกกับการจอง

Vehicles & Users
- เก็บข้อมูลรถลูกค้า (brand/model/year/plate/color)
- ลูกค้าแก้ไขโปรไฟล์ แอดมินจัดการบทบาท

Dashboard & Reporting
- การ์ดสถิติ: จองวันนี้, pending, ลูกค้าทั้งหมด, รายได้เดือนนี้, สินค้าใกล้หมด
- รายการจองล่าสุด

Notifications
- สร้างแจ้งเตือนเมื่อสร้าง/เปลี่ยนสถานะการจอง
- การขอยกเลิก/ยกเลิกจะสร้างแจ้งเตือนสำหรับแอดมินเสมอ และแนบเหตุผลที่ลูกค้ากรอก

History
- customer: ไทม์ไลน์รายการของตนเอง ดาวน์โหลดใบสรุปเป็น PDF ได้สำหรับงานที่ยืนยัน
- admin/mechanic: ค้นหาผู้ใช้และดูรายการแบบยุบ/ขยาย

Chat AI
- ส่งข้อความไป n8n Cloud → AI Agent (Groq) → ส่งข้อความตอบกลับ

## 6) ความต้องการเชิงไม่เป็นหน้าที่
- Performance: UI < 3s, สร้างการจอง < 5s
- Reliability: ใช้ธุรกรรมฐานข้อมูลกับงานสำคัญ (จอง ตัดสต็อก)
- Security: JWT, ตรวจ `X-N8N-SECRET`, ไม่เก็บรหัสผ่านแบบ plain
- Resilience: หาก Socket.IO เชื่อมไม่ได้ ให้มี Polling fallback (Notifications ~20s, Parts ~30s, Dashboard ~60s)
- Observability: Render Logs, n8n Executions

## 7) โมเดลข้อมูล
- users(id, username, email, role, …)
- vehicles(id, user_id, brand, model, year, license_plate, color)
- services(id, name, price, duration)
- parts(id, name, sku, quantity, min_stock, selling_price)
- bookings(id, user_id, vehicle_id, booking_date, booking_time, total_price, notes, payment_method, payment_status, slip_image, status CHECK IN ('pending','confirmed','in_progress','completed','cancelled','cancel_requested'))
- booking_services(booking_id, service_id)
- booking_parts(booking_id, part_id)
- notifications(id, user_id, title, message, type, related_booking_id)

## 8) API สรุป
- /api/auth: register, login, me
- /api/bookings: list, my-bookings, get/:id, create, put/:id, put/:id/status, put/:id/cancel, slots/available, delete/user/:userId
- /api/services, /api/parts: CRUD (admin)
- /api/users: จัดการผู้ใช้/ยานพาหนะ
- /api/notifications: list, unread-count, read/:id, read/all, delete/:id
- /api/dashboard: สถิติรวม/ลูกค้า
- /api/chat: ส่งข้อความไป n8n Cloud
- Alias: /bookings ชี้เส้นทางเดียวกับ /api/bookings เพื่อความเข้ากันได้

## 9) การเชื่อมต่อภายนอก
- n8n Cloud: Production URL, ตรวจ `X-N8N-SECRET`
- Google Drive/Sheets: ทำงานเมื่อสถานะเป็น `confirmed`
- Supabase: ใช้ `DATABASE_URL` (sslmode=require)

## 10) ข้อจำกัด/สมมติฐาน
- หากฐานข้อมูลยังไม่มีค่า `cancel_requested` ใน CHECK constraint ระบบจะ fallback ไปบันทึกเหตุผลใน notes และสร้างแจ้งเตือน โดยไม่เปลี่ยนสถานะ
- บริการภายนอกอาจล่ม/จำกัดทรัพยากร (free tier)

## 11) เกณฑ์ยอมรับ
- ลูกค้าจองได้และเห็นประวัติของตัวเอง
- การยกเลิกมีเหตุผลประกอบ และแอดมินได้รับแจ้งเตือน
- เมื่อแอดมินยืนยัน การส่งข้อมูลไป n8n+Google สำเร็จ
- Dashboard/History/Notifications แสดงผลถูกต้องตามบทบาท

## 12) ความเสี่ยง
- การตั้งค่า env ผิดทำให้เชื่อมต่อไม่ได้
- `N8N_SECRET` อ่อนแอ
- ความคลาดเคลื่อนเวลาจองทำให้ชนสล็อต

## 13) ตัวชี้วัด
- อัตราความล้มเหลวส่งไป n8n < 2%
- เวลาโหลด Dashboard < 3s
- ความถูกต้องของสต็อกและรายงานตรงตามธุรกรรม
