# เอกสารสเปคความต้องการซอฟต์แวร์ (SRS) — motorbike_project

## 1) บทนำ
- ชื่อระบบ: Motorbike Service Management System
- เป้าหมาย: จัดการการจองคิวซ่อมรถ, บริการ/อะไหล่, สต็อก, สถานะงาน, ประวัติการใช้บริการ และเชื่อมต่ออัตโนมัติไปยัง Google Drive/Sheets ผ่าน n8n Cloud
- ผู้มีส่วนได้ส่วนเสีย: แอดมินร้าน, ช่าง, ลูกค้า, ผู้ดูแลโครงสร้างพื้นฐาน (Render/Vercel/Supabase/n8n Cloud)

## 2) ขอบเขต
- ลูกค้าสร้างการจอง เลือกบริการ/อะไหล่ ระบุเวลา แนบสลิป (ถ้ามี)
- แอดมิน/ช่างปรับสถานะงานและแก้ไขรายละเอียด/ราคา/วันที่/เวลา
- ระบบส่งข้อมูลการจองที่ยืนยันแล้วไป n8n Cloud เพื่ออัปโหลดไฟล์และบันทึก Sheets
- แสดงสถิติภาพรวม ระบบแจ้งเตือน และหน้าประวัติการใช้บริการตามบทบาท

## 3) สถาปัตยกรรม
- Frontend: Next.js 14 + TypeScript + Tailwind (โฮสต์ Vercel)
- Backend: Node.js/Express + Socket.IO (โฮสต์ Render)
- Database: Supabase (PostgreSQL, sslmode=require)
- Automation: n8n Cloud (Production Webhook)
- External: Google Drive/Sheets
- Security: JWT (x-auth-token), CORS เฉพาะโดเมนที่อนุญาต, X-N8N-SECRET

## 4) บทบาทและสิทธิ์
- admin: จัดการทั้งหมด, แก้ไขการจอง/ราคา, CRUD บริการ/อะไหล่, สถิติ
- mechanic: ดูงานและอัปเดตสถานะ, แก้ไขราคา/หมายเหตุ
- customer: จองคิว, ดูสถานะและประวัติของตัวเอง

## 5) ความต้องการเชิงหน้าที่
Authentication
- สมัคร/เข้าสู่ระบบด้วยอีเมล+รหัสผ่าน, ออก/ตรวจ JWT

Booking
- สร้างการจอง: วันที่, เวลา, บริการ, อะไหล่, หมายเหตุ, วิธีชำระ (promptpay/shop), แนบสลิป
- ตรวจสอบสล็อตเวลาว่าง (ไม่ชน) ก่อนบันทึก
- แอดมิน/ช่างแก้ไขการจอง (วันที่/เวลา/หมายเหตุ/ราคา) และเปลี่ยนสถานะ
- เมื่อสถานะเป็น confirmed ส่งข้อมูลไป n8n Cloud เพื่ออัปโหลดสลิป/placeholder และบันทึก Sheets

Inventory & Services
- จัดการบริการ (CRUD, admin only) พร้อมราคา/ระยะเวลา
- จัดการอะไหล่ (CRUD) พร้อมราคา/จำนวนขั้นต่ำ และตัดสต็อกเมื่อผูกกับการจอง

Vehicles & Users
- เก็บข้อมูลรถลูกค้า (brand/model/year/plate/color)
- ลูกค้าแก้ไขโปรไฟล์, แอดมินจัดการบทบาท

Dashboard & Reporting
- การ์ดสถิติ: จองวันนี้, pending, ลูกค้าทั้งหมด, รายได้เดือนนี้, สินค้าใกล้หมด
- รายการจองล่าสุดพร้อมรายละเอียด

Notifications
- สร้างแจ้งเตือนเมื่อสร้าง/เปลี่ยนสถานะการจอง และแสดงในหน้า Notifications

History
- customer: เห็นประวัติของตนเองแบบไทม์ไลน์
- admin/mechanic: รายชื่อผู้ใช้แบบยุบ/ขยาย แล้วดูรายการของผู้ใช้รายบุคคล
- อัปเดตทันทีเมื่อแอดมินแก้ไขรายละเอียดการจอง

Chat AI
- ส่งข้อความไป n8n Cloud → AI Agent (Groq) → ส่งข้อความตอบกลับ

## 6) ความต้องการเชิงไม่เป็นหน้าที่
- Performance: UI ตอบสนอง < 3s, สร้างการจอง < 5s
- Reliability: ใช้ธุรกรรมฐานข้อมูลสำหรับงานสำคัญ (จอง, ตัดสต็อก)
- Security: ป้องกันด้วย JWT, ตรวจ X-N8N-SECRET, ไม่บันทึกรหัสผ่านแบบ plain
- Scalability: แยกบริการ Frontend/Backend/Automation/DB
- Maintainability: โครงสร้างโค้ดแบ่งหน้า/เส้นทาง/มิดเดิลแวร์ชัดเจน
- Observability: Render Logs, n8n Executions, Health checks ขั้นพื้นฐาน

## 7) โมเดลข้อมูล
- users(id, username, email, role, …)
- vehicles(id, user_id, brand, model, year, license_plate, color)
- services(id, name, price, duration)
- parts(id, name, sku, quantity, min_stock, selling_price)
- bookings(id, user_id, vehicle_id, booking_date, booking_time, total_price, notes, payment_method, payment_status, slip_image, status)
- booking_services(booking_id, service_id)
- booking_parts(booking_id, part_id)
- notifications(id, user_id, title, message, type, related_booking_id)

## 8) API สรุป
- /api/auth: register, login, me
- /api/bookings: list, my-bookings, get/:id, create, put/:id (แก้ไขวันที่/เวลา/หมายเหตุ/ราคา), put/:id/status, slots/available, delete/user/:userId
- /api/services, /api/parts: CRUD (admin)
- /api/users: ข้อมูลผู้ใช้/รถ, เปลี่ยนบทบาท (admin)
- /api/notifications: list/read/delete
- /api/dashboard: สถิติรวม/ลูกค้า
- /api/chat: ส่งข้อความไป n8n Cloud

## 9) การเชื่อมต่อภายนอก
- n8n Cloud: Production URL, ตรวจ X-N8N-SECRET ทุกครั้ง
- Google Drive/Sheets: ผ่าน workflow เมื่อสถานะเป็น confirmed
- Supabase: ใช้ DATABASE_URL (sslmode=require)

## 10) ข้อจำกัด/สมมติฐาน
- บริการภายนอกอาจล่ม/จำกัดทรัพยากร (free tier)
- ผู้ใช้ต้องมีอินเทอร์เน็ตและเบราว์เซอร์สมัยใหม่

## 11) เกณฑ์ยอมรับ
- ลูกค้าจองได้และเห็นประวัติของตัวเอง
- แอดมินยืนยันแล้วข้อมูลไปยัง n8n+Google ได้ครบ
- หน้าจอ Dashboard/History/Notifications ทำงานตามบทบาท
- ฟังก์ชันแก้ไขการจองของแอดมินกระทบหน้าประวัติของลูกค้าและแอดมินทันที

## 12) ความเสี่ยง
- การตั้งค่า env ผิดทำให้เชื่อมต่อไม่ได้
- N8N_SECRET อ่อนแอทำให้ webhook ถูกโจมตี
- การจัดการเวลาจองผิดรูปแบบทำให้ชนสล็อต/บันทึกไม่ได้

## 13) ตัวชี้วัด
- อัตราความล้มเหลวส่งไป n8n < 2%
- เวลาโหลด Dashboard < 3s
- ความถูกต้องของสต็อกและรายงานตรงตามธุรกรรม
