# Software Requirements Specification (SRS) — Motorbike Service Web App

## 1. บทนำ
- ชื่อระบบ: Motorbike Service Management System (motorbike_project)
- วัตถุประสงค์: ระบบเว็บสำหรับจองคิวซ่อม จัดการอะไหล่ ดูสถิติ/รายงาน เชื่อมต่ออัตโนมัติไป Google Drive/Sheets และมี Chat AI สำหรับช่วยตอบคำถามลูกค้า
- ผู้มีส่วนได้ส่วนเสีย: เจ้าของร้าน/แอดมิน, ช่าง, ลูกค้า, ผู้ดูแลระบบโครงสร้างพื้นฐาน (Render/Vercel/Supabase/n8n Cloud)

## 2. ขอบเขตระบบ
- ลูกค้าจองคิว เลือกบริการแนบรายละเอียดและสลิป (หรือชำระที่ร้าน)
- แอดมิน/ช่างจัดการสถานะงาน ดูสถิติและสต็อก
- เมื่อแอดมินยืนยันการจอง ระบบจะส่งข้อมูลไป n8n Cloud เพื่ออัปโหลดไฟล์สลิป (หรือไฟล์ placeholder) และบันทึกลง Google Sheets
- Chat AI ใช้ Groq ช่วยตอบคำถามเบื้องต้น

## 3. สถาปัตยกรรมโดยย่อ
- Frontend: Next.js 14 (TypeScript, Tailwind, Zustand), โฮสต์บน Vercel
- Backend: Node.js/Express, โฮสต์บน Render
- Database: Supabase (Managed PostgreSQL) เชื่อมผ่านไลบรารี pg
- Real-time: Socket.IO
- Automation: n8n Cloud (Webhook Production URL https)
- External: Google Drive, Google Sheets
- Security: JWT (x-auth-token), X-N8N-SECRET สำหรับ Webhook ไป n8n Cloud, CORS เฉพาะโดเมนที่อนุญาต

## 4. บทบาทผู้ใช้
- admin: จัดการระบบทั้งหมด, ยืนยัน/อัปเดตสถานะงาน, ดูสถิติ, แก้ไขข้อมูล
- mechanic: ดูและอัปเดตงานซ่อม
- customer: จองคิว ดูประวัติ/สถานะ ปรับข้อมูลส่วนตัว

## 5. ความต้องการเชิงหน้าที่ (Functional Requirements)
1) Authentication
- สมัคร/เข้าสู่ระบบด้วยอีเมลและรหัสผ่าน
- สร้าง/ตรวจสอบ JWT, ป้องกัน route ด้วย middleware

2) Booking
- ลูกค้าสร้างการจอง: วันที่, เวลา, บริการ, อะไหล่, รายละเอียด, วิธีชำระ (promptpay/shop), แนบสลิป (ถ้ามี)
- ตรวจเวลาว่าง (ไม่ชนกัน) และบันทึกข้อมูล
- หักสต็อกอะไหล่เมื่อผูกกับการจอง
- แอดมินปรับสถานะ: pending → confirmed → in_progress → completed/cancelled
- เมื่อ confirmed: ส่ง webhook ไป n8n Cloud พร้อมข้อมูล booking และไฟล์สลิป (หรือไฟล์ placeholder)

3) Inventory & Services
- จัดการบริการ (CRUD, admin only)
- จัดการอะไหล่ (ชื่อ, SKU, quantity, min_stock, ราคา ฯลฯ) และตัดสต็อก
- แจ้งเตือนสินค้าใกล้หมด

4) Vehicles & Users
- เก็บข้อมูลรถลูกค้า, เพิ่มรถใหม่เมื่อจองถ้ายังไม่มี
- แก้ไขโปรไฟล์ลูกค้า, จัดการบทบาทผู้ใช้ (admin only)

5) Dashboard & Reporting
- แสดงสถิติหลัก: จองวันนี้, pending, ลูกค้าทั้งหมด, รายได้เดือนนี้, สินค้าใกล้หมด
- ตารางการจองล่าสุด

6) Notifications
- สร้างแจ้งเตือนเมื่อสร้างจอง/สถานะเปลี่ยน
- หน้า Notifications แสดงและเปิดดูรายละเอียดการจองที่เกี่ยวข้อง

7) History
- customer: เห็นประวัติของตนเอง
- admin/mechanic: เห็นรายชื่อผู้ใช้เป็นรายการ จากนั้นกดดูประวัติของผู้ใช้ที่เลือก

8) Chat AI
- Webhook รับข้อความ → AI Agent (Groq) → ส่งข้อความตอบกลับ

## 6. ความต้องการเชิงไม่เป็นหน้าที่ (Non-Functional Requirements)
- Performance: ตอบสนอง UI ภายใน 2–3 วินาทีในงานทั่วไป
- Reliability: ข้อมูลจอง/สต็อกทำแบบ transaction เพื่อความถูกต้อง
- Security: JWT เฉพาะ route ที่ต้อง login; เช็ค X-N8N-SECRET ก่อนทำงานใน n8n; ไม่เก็บรหัสผ่านแบบ plain
- Scalability: แยก frontend/backend และบริการ n8n Cloud; DB บน Supabase ที่รองรับการสเกล
- Maintainability: โครงสร้างโค้ดชัดเจน, ใช้มิดเดิลแวร์, แยกไฟล์ route/หน้า
- Observability: Render Logs, n8n Executions, Metrics เบื้องต้น

## 7. โมเดลข้อมูลหลัก
- users, vehicles, services, parts, bookings, booking_services, booking_parts, notifications, transactions
- booking.status: pending, confirmed, in_progress, completed, cancelled
- ความสัมพันธ์: bookings ↔ booking_services/booking_parts (ON DELETE CASCADE)

## 8. API หลัก (สรุป)
- /api/auth: register, login, me
- /api/users: get/update, vehicles CRUD, change role, delete user (admin)
- /api/services: CRUD (admin)
- /api/bookings: list, my-bookings, get/:id, create, update status, slots/available, delete/user/:userId (admin)
- /api/notifications: list/read/delete
- /api/dashboard: สถิติรวม, customer-stats
- /api/chat: ส่งข้อความไป n8n Cloud

## 9. การเชื่อมต่อภายนอก
- n8n Cloud: ใช้ Production URL https; ตรวจ X-N8N-SECRET
- Google Drive/Sheets: ผ่าน workflow เมื่อยืนยันการจอง
- Supabase: DATABASE_URL (sslmode=require)

## 10. ข้อจำกัดและสมมติฐาน
- ขึ้นอยู่กับความพร้อมของบริการภายนอก (Render/Vercel/n8n Cloud/Google/Supabase)
- Free tier อาจมีข้อจำกัดด้านทรัพยากร/ความเร็ว
- ผู้ใช้ต้องมีอินเทอร์เน็ตและเบราว์เซอร์สมัยใหม่

## 11. เกณฑ์การยอมรับ (Acceptance Criteria)
- ลูกค้าจองได้ ตรวจเวลาว่างและเห็นประวัติของตนเอง
- แอดมินยืนยันแล้วเห็นข้อมูลไปบันทึกใน Google Sheets และไฟล์ใน Drive ผ่าน n8n
- หน้าจอ Dashboard/History/Notifications ทำงานตามบทบาท
- Chat AI ตอบข้อความผ่าน workflow ได้

## 12. ขอบเขตนอก (Out of Scope)
- ระบบชำระเงินออนไลน์สมบูรณ์ (เก็บสลิปแทน)
- ระบบบัญชีสมบูรณ์ (transactions ใช้เพื่อสรุปเบื้องต้น)

## 13. ความเสี่ยง
- การล้มเหลวของบริการภายนอก (n8n/Google/Supabase)
- การตั้งค่า env ไม่ถูกต้อง
- ปัญหาความปลอดภัยหากไม่เปลี่ยน N8N_SECRET เป็นค่าแข็งแรง

## 14. ตัวชี้วัดสำเร็จ (KPIs)
- เวลาเฉลี่ยสร้างการจอง < 5s
- อัตราความล้มเหลวส่งไป n8n < 2%
- เวลาโหลด Dashboard < 3s
