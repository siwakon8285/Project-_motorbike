# คู่มือการพัฒนาและดีพลอย (IMPLEMENT) — motorbike_project

## 1) สถาปัตยกรรม
- Frontend: Next.js 14 + TypeScript + Tailwind + App Router
- Backend: Node.js/Express + Socket.IO + pg
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
FRONTEND_ORIGINS=https://<your>.vercel.app
N8N_SECRET=<random>
N8N_WEBHOOK_URL=https://<subdomain>.n8n.cloud/webhook/<chat-id>
N8N_SHEETS_WEBHOOK_URL=https://<subdomain>.n8n.cloud/webhook/confirm-booking
```
Frontend (Vercel)
```
NEXT_PUBLIC_API_URL=https://<render-app>.onrender.com
```

## 4) ขั้นตอนดีพลอย
- Supabase: สร้างโปรเจกต์ → รับ `DATABASE_URL`
- Render: สร้าง Web Service → ตั้งค่า .env ตามข้อ 3 → Deploy
- Vercel: ตั้งค่า `NEXT_PUBLIC_API_URL` ให้ชี้ไป Render → Deploy
- n8n Cloud: สร้างและ Publish workflows (Chat/Booking) ให้มี Production URL

## 5) สัญญา API สำคัญ
- สร้างการจอง
```
POST /api/bookings
FormData: bookingDate, bookingTime, serviceIds[], partIds[], vehicleId?, vehicle(json), notes, paymentMethod, slipImage(file?)
```
- แก้ไขการจอง
```
PUT /api/bookings/:id
Body: { bookingDate?: string(YYYY-MM-DD), bookingTime?: string(HH:mm), notes?: string, totalPrice?: number }
สิทธิ์แก้ไขราคา: admin/mechanic เท่านั้น
ตรวจชนเวลา: เปรียบเทียบแบบ time โดยตรง
```
- เปลี่ยนสถานะ
```
PUT /api/bookings/:id/status
Body: { status: 'pending'|'confirmed'|'in_progress'|'completed'|'cancelled' }
เมื่อ 'confirmed' → ส่งข้อมูลไป n8n Cloud (รวมสลิป/placeholder)
```
- ประวัติ
```
GET /api/bookings        (admin/mechanic: เห็นทั้งหมด, customer: เห็นของตนเอง)
GET /api/bookings/my-bookings   (customer)
GET /api/bookings/:id
```
- สล็อตเวลาว่าง
```
GET /api/bookings/slots/available?date=YYYY-MM-DD
```
- ลบการจองของผู้ใช้และรี sequence
```
DELETE /api/bookings/user/:userId   (admin)
```

## 6) การเชื่อมต่อ n8n Cloud
- Chat Workflow: Webhook → ตรวจ `X-N8N-SECRET` → Groq → Respond
- Booking Workflow: Webhook → ตรวจ `X-N8N-SECRET` → Move Binary Data (จาก `slip_image_base64`) → Google Drive Upload → Google Sheets Append → Respond

## 7) ขั้นตอนพัฒนาท้องถิ่น
- ติดตั้ง: `npm run install-deps`
- รัน dev: `npm run dev` (เปิด server + client พร้อมกัน)
- Frontend ชี้ API: ตั้ง `NEXT_PUBLIC_API_URL=http://localhost:5000`
- ตรวจ Logs: ดู Console ของทั้ง frontend และ backend

## 8) การทดสอบแนะนำ
- Manual:
  - สมัคร/ล็อกอิน → จองคิว → แอดมินยืนยัน → ตรวจดู Drive/Sheets/n8n Executions
  - แก้ไขการจอง (วันที่/เวลา/ราคา/หมายเหตุ) → ตรวจหน้า History ลูกค้าและแอดมิน
  - แชท AI → รับข้อความตอบกลับ
- Automated (ทางเลือก): Jest + Supertest สำหรับ routes สำคัญ

## 9) ความปลอดภัย/แนวปฏิบัติ
- ใช้ `N8N_SECRET` ที่ปลอดภัยและเปลี่ยนตามรอบเวลา
- จำกัด CORS เฉพาะโดเมนที่อนุญาต
- ใช้ bcrypt สำหรับรหัสผ่าน, ส่ง JWT ทาง Header `x-auth-token`
- จัดการข้อผิดพลาดอย่างสม่ำเสมอและส่งข้อความมาตรฐาน

## 10) การดูแลระบบ/แก้ปัญหา
- Render: ตรวจ Logs/Health; หาก API 404 หลังปรับโค้ด ให้ Redeploy เพื่อโหลด routes ใหม่
- Vercel: ตรวจค่า `NEXT_PUBLIC_API_URL`
- n8n Cloud: ตรวจ Executions → ดู node ใดล้มเหลว
- Supabase: เปิด SSL, ตรวจการใช้งาน, สำรองข้อมูล

## 11) พัฒนาต่อ
- หน้า `/bookings/new` แบบฟอร์มเต็ม
- แก้ไขบริการ/อะไหล่ในรายการเพื่อคำนวณราคาอัตโนมัติ
- Export รายงาน, Line/Email Notification ผ่าน n8n
