# IMPLEMENTATION GUIDE — Motorbike Service Web App

## 1. สถาปัตยกรรม
- Frontend: Next.js 14 (TypeScript, Tailwind, Zustand), App Router
- Backend: Node.js/Express, Socket.IO, pg (เชื่อม Supabase)
- Database: Supabase (PostgreSQL, sslmode=require)
- Automation: n8n Cloud (Chat & Booking workflows)
- Hosting: Vercel (Frontend), Render (Backend)

## 2. โครงสร้างโปรเจกต์
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
├── README.md
├── SRS.md
└── IMPLEMENT.md
```

## 3. การตั้งค่า Environment
- Backend (Render / Local `backend/.env`)
```
PORT=5000
DATABASE_URL=postgresql://postgres:<PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres?sslmode=require
JWT_SECRET=<random>
N8N_SECRET=<random>
N8N_WEBHOOK_URL=https://<subdomain>.n8n.cloud/webhook/<chat-id>
N8N_SHEETS_WEBHOOK_URL=https://<subdomain>.n8n.cloud/webhook/confirm-booking
FRONTEND_ORIGINS=https://project-motorbike.vercel.app
```
- Frontend (Vercel)
  - NEXT_PUBLIC_API_URL=https://<render-app>.onrender.com

## 4. ขั้นตอนดีพลอย
- Supabase: สร้างโปรเจกต์ → คัดลอก `DATABASE_URL`
- Render: สร้าง Web Service → ตั้ง Environment ตามข้อ 3 → Deploy
- Vercel: ตั้งค่า NEXT_PUBLIC_API_URL → Deploy
- n8n Cloud: สร้าง 2 workflows (Chat, Booking) และ Publish ให้มี Production URL

## 5. Workflow รายละเอียด (n8n Cloud)
- Chat:
  - Webhook (POST) → IF ตรวจ `X-N8N-SECRET` → AI Agent (Groq) → Respond to Webhook (ส่ง `{reply: "..."} `)
- Booking:
  - Webhook (POST) → IF ตรวจ `X-N8N-SECRET` →
  - Move Binary Data (JSON→Binary จาก `slip_image_base64` เป็น `data`) →
  - Google Drive: Upload (`data`) →
  - Google Sheets: Append row (แมปค่าจาก bookingData) →
  - Respond to Webhook

## 6. จุดเชื่อม Backend ↔ n8n
- chat.js: ส่งข้อความไป `N8N_WEBHOOK_URL` พร้อม Header `X-N8N-SECRET`
- bookings.js: เมื่อ `status=confirmed` ดึงข้อมูลเต็ม + สลิป (หรือ placeholder) แล้ว POST ไป `N8N_SHEETS_WEBHOOK_URL` พร้อม Header `X-N8N-SECRET`

## 7. การทำงานสำคัญใน Backend
- ตรวจสอบ JWT ด้วย `middleware/auth.js`
- โหลดสคีมาฐานข้อมูลจาก `config/schema.sql` ใน `server.js`
- เส้นทางใหม่ (Admin):
  - `DELETE /api/bookings/user/:userId` ลบการจองของผู้ใช้และรี sequence id
- Slots:
  - `/api/bookings/slots/available?date=YYYY-MM-DD` คืนเวลาว่างโดยตัดเวลาที่ถูกจองแล้ว

## 8. การปรับ UI ที่ทำแล้ว
- History:
  - admin/mechanic: หน้ารายชื่อผู้ใช้ → กดดูประวัติรายบุคคล
  - customer: แสดงรายการของตัวเอง
  - ซ่อน “รวมยอด” ในรายชื่อผู้ใช้
- Dashboard:
  - ปุ่ม “จองคิวใหม่” → `/bookings/new`

## 9. ความปลอดภัยและแนวปฏิบัติ
- หมุนเปลี่ยน `N8N_SECRET` เป็นค่าแข็งแรงและรักษาความลับ
- จำกัด CORS ให้เฉพาะโดเมนที่อนุญาต (localhost, *.vercel.app, FRONTEND_ORIGINS)
- ไม่บันทึกรหัสผ่านแบบ plain; ใช้ bcrypt + JWT
- ตรวจสอบและจัดการข้อผิดพลาดทุกเส้นทาง ส่งข้อความมาตรฐาน

## 10. การทดสอบแนะนำ
- Unit/Integration (ภายหลัง): Jest + Supertest (แนะนำ)
- Manual flows:
  - สมัคร/ล็อกอิน → จองคิว → แอดมินยืนยัน → ตรวจ Drive/Sheets/n8n Executions
  - แชท → ตรวจข้อความตอบกลับ
  - History/Notifications/Dashboard แสดงข้อมูลถูกต้องตามบทบาท

## 11. การดูแลระบบ
- Render: ตรวจ Logs และ Metrics
- n8n Cloud: ตรวจ Executions (Failed/Success)
- Supabase: เปิด SSL, ติดตาม usage และสำรองข้อมูล

## 12. การพัฒนาต่อ
- เพิ่มหน้า `/bookings/new` เป็นฟอร์มสร้างจองโดยตรง
- เพิ่ม Report/Export CSV
- เพิ่มสิทธิ์ละเอียดสำหรับ mechanic
- ตั้งระบบแจ้งเตือนผ่าน Line/Email (ผ่าน n8n)
