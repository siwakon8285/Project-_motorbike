# คู่มือการพัฒนาและดีพลอย (IMPLEMENT) — motorbike_project

## 1) สถาปัตยกรรม
- Frontend: Next.js 14 + TypeScript + Tailwind + App Router
- Backend: Node.js/Express + Socket.IO + pg (มี Polling fallback เมื่อ Socket ใช้งานไม่ได้)
- Database: Supabase (PostgreSQL, sslmode=require)
- Automation: n8n Cloud (Chat/Booking Workflows)
- Hosting: Vercel (Frontend), Render (Backend)

## 2) โครงสร้างโปรเจกต์
```
motorbike_project/
├── backend/
│   ├── server.js
│   ├── config/db.js, config/schema.sql
│   ├── middleware/auth.js
│   └── routes/
│       ├── auth.js, users.js, services.js, parts.js
│       ├── bookings.js, notifications.js, dashboard.js, chat.js
├── frontend/
│   └── src/app/…, src/components/…, src/contexts/AuthContext.tsx
├── SRS.md
└── IMPLEMENT.md
```

## 3) ตัวแปรสภาพแวดล้อม
Backend (`backend/.env` หรือ Render)
```
PORT=5000
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=<random>
FRONTEND_ORIGINS=https://<your>.vercel.app,https://<your2>.domain
N8N_SECRET=<random>
N8N_WEBHOOK_URL=https://<subdomain>.n8n.cloud/webhook/<chat-id>
N8N_SHEETS_WEBHOOK_URL=https://<subdomain>.n8n.cloud/webhook/confirm-booking
```
Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://<render-app>.onrender.com
```

## 4) สคีมาฐานข้อมูล
- ตาราง `bookings.status` รองรับค่า: `pending, confirmed, in_progress, completed, cancelled, cancel_requested`
- หาก DB เก่ายังไม่มี `cancel_requested` ระบบมี fallback ฝั่ง Backend เพื่อลด error ขณะดีพลอย

ตัวอย่างปรับ CHECK constraint (ถ้าจำเป็น)
```
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_status_check,
  ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','cancel_requested'));
```

## 5) ขั้นตอนดีพลอย
- Supabase: สร้างโปรเจกต์ → รับ `DATABASE_URL`
- Render: สร้าง Web Service → ตั้งค่า .env ตามข้อ 3 → Deploy
- Vercel: ตั้งค่า `NEXT_PUBLIC_API_URL` ให้ชี้ไป Render → Deploy
- n8n Cloud: สร้างและ Publish workflows (Chat/Booking) ให้มี Production URL
- ตรวจ CORS/Socket: อนุญาตโดเมนโปรดักชันใน `FRONTEND_ORIGINS`

## 6) สัญญา API สำคัญ
สร้างการจอง
```
POST /api/bookings
FormData: bookingDate, bookingTime, serviceIds[], partIds[], vehicleId?, vehicle(json),
          notes, paymentMethod, slipImage(file?)
```
แก้ไขการจอง
```
PUT /api/bookings/:id
Body: { bookingDate?, bookingTime?, notes?, totalPrice? }
```
เปลี่ยนสถานะ
```
PUT /api/bookings/:id/status
Body: { status: 'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'|'cancel_requested' }
```
ยกเลิกแบบลูกค้า
```
PUT /api/bookings/:id/cancel
Body: { reason: string }
Logic:
  - ถ้าเดิมเป็น pending → เปลี่ยนเป็น cancelled และแจ้งแอดมิน
  - ถ้าเป็น confirmed → เปลี่ยนเป็น cancel_requested และแจ้งแอดมิน
  - เพิ่มบรรทัด “คำขอยกเลิกโดยลูกค้า: <reason>” ลง notes
```
ประวัติและอื่นๆ
```
GET /api/bookings, /api/bookings/:id, /api/bookings/my-bookings
GET /api/bookings/slots/available?date=YYYY-MM-DD
DELETE /api/bookings/user/:userId   (admin)
```
Notifications
```
GET /api/notifications
GET /api/notifications/unread-count
PUT /api/notifications/:id/read
PUT /api/notifications/read/all
DELETE /api/notifications/:id
```
หมายเหตุ: มี Alias `/bookings` ที่ชี้เส้นทางเดียวกับ `/api/bookings`

## 7) การเชื่อมต่อ n8n Cloud
- Chat Workflow: Webhook → ตรวจ `X-N8N-SECRET` → Groq → Respond
- Booking Workflow: Webhook → ตรวจ `X-N8N-SECRET` → ยืนยันการจอง → อัปโหลดสลิป/placeholder ไป Google Drive → Append Google Sheets

## 8) Frontend สำคัญที่อัปเดตล่าสุด
- History: มี Modal ให้ลูกค้ากรอกเหตุผลก่อนยกเลิก และเรียก `/api/bookings/:id/cancel`
- Admin Bookings: ลบปุ่ม “ยืนยันยกเลิก”; ให้ยืนยันการยกเลิกผ่านหน้า Notifications
- Notifications: รองรับเรียลไทม์ด้วย Socket.IO และมี Polling fallback ทุก ~20 วินาที
- Parts: Socket.IO สำหรับอัปเดตสต็อกแบบสด พร้อม Polling fallback ทุก ~30 วินาที
- Dashboard: รับเหตุการณ์ `booking_completed` และมี Polling fallback ทุก ~60 วินาที

## 9) แนวปฏิบัติด้านความปลอดภัย
- ใช้ `N8N_SECRET` ที่ปลอดภัยและหมุนเวียนได้
- จำกัด CORS เฉพาะโดเมนที่อนุญาต รวมทั้งโดเมน Vercel
- เก็บ JWT ผ่าน Header `x-auth-token`
- ใช้ parameterized queries ทุกจุด

## 10) ขั้นตอนพัฒนาท้องถิ่น
- ติดตั้ง: `npm run install-deps`
- รัน dev: `npm run dev`
- ตั้ง `NEXT_PUBLIC_API_URL=http://localhost:5000`
- เปิด Console ทั้ง client และ server เพื่อตรวจ log

## 11) การทดสอบก่อนดีพลอย
- ลูกค้า: สมัคร/ล็อกอิน → จองคิว → ยกเลิกพร้อมเหตุผล → ตรวจ Notifications แอดมิน
- แอดมิน: ยืนยันการจอง → ตรวจ Drive/Sheets บน n8n, ยืนยันการยกเลิกจาก Notifications
- คลังอะไหล่: เพิ่ม/แก้ไข/ลบ แล้วตรวจการอัปเดตบนหน้า Parts
- Dashboard: ตรวจสถิติอัปเดตหลังเปลี่ยนสถานะ

## 12) แก้ปัญหาที่พบบ่อย
- Error สคีมาเมื่อใช้ `cancel_requested`: ปรับ CHECK constraint ตามข้อ 4 หรือพึ่ง fallback
- การเชื่อม Socket ไม่ติด: ใช้ Polling fallback อัตโนมัติ ตรวจ `FRONTEND_ORIGINS`
- n8n ล้มเหลว: ตรวจ Executions และค่า `N8N_*` ใน .env
