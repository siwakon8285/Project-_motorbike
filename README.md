# ระบบจัดการร้านซ่อมรถจักรยานยนต์ (Motorbike Service Management System)

ระบบเว็บแอปพลิเคชันสำหรับบริหารจัดการร้านซ่อมรถจักรยานยนต์ ครอบคลุมตั้งแต่การจองคิว การจัดการอะไหล่ ไปจนถึงระบบอัตโนมัติและการแจ้งเตือน

## 📋 ภาพรวมระบบ (Overview)

โปรเจกต์นี้ถูกพัฒนาขึ้นเพื่อช่วยอำนวยความสะดวกในการดำเนินงานของร้านซ่อมรถจักรยานยนต์ โดยมีฟีเจอร์หลักคือการจองคิวซ่อมออนไลน์ การจัดการสต็อกอะไหล่แบบ Real-time และการเชื่อมต่อกับระบบภายนอก (n8n, Google Workspace) เพื่อทำ Automation

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Real-time**: Socket.IO Client
- **Charts**: Recharts
- **PDF Generation**: jsPDF, html2canvas

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database Driver**: pg (PostgreSQL)
- **Real-time**: Socket.IO
- **Authentication**: JWT & Bcrypt
- **File Upload**: Multer

### Database
- **Provider**: Supabase (Managed PostgreSQL)
- **Engine**: PostgreSQL (เชื่อมต่อผ่านไลบรารี pg)
- **Features**: Transactions support (Atomic operations for stock deduction), SSL, managed backups

### Automation & Integrations
- **Workflow Automation**: n8n Cloud (Production URL แบบ https คงที่)
- **Cloud Storage**: Google Drive (เก็บไฟล์สลิปโอนเงิน / ไฟล์แนบ)
- **Data Logging**: Google Sheets (บันทึกข้อมูลการจอง)
- **AI**: Groq (สำหรับระบบ Chatbot)

---

## ✨ ฟีเจอร์หลัก (Key Features)

### 1. ระบบการจอง (Booking System)
- ลูกค้าสามารถจองคิวซ่อมผ่านหน้าเว็บ
- รองรับการเลือกบริการ (Services) และระบุอาการเบื้องต้น
- **Payment**: รองรับการแนบสลิปโอนเงิน (PromptPay) หรือชำระหน้าร้าน
- **Validation**: ตรวจสอบวันและเวลาว่างโดยอัตโนมัติ

### 2. การจัดการอะไหล่และสต็อก (Inventory Management)
- **Real-time Sync**: อัปเดตจำนวนสต็อกทันทีที่มีการจองหรือแก้ไขข้อมูลผ่าน Socket.IO
- **Stock Deduction**: ตัดสต็อกอัตโนมัติเมื่อมีการยืนยันการใช้อะไหล่ (ใช้ Database Transaction เพื่อความถูกต้อง)
- แจ้งเตือนเมื่อสินค้าหมด (Out of Stock)

### 3. ระบบจัดการผู้ใช้ (User Management & Roles)
- **Roles**:
  - `admin`: จัดการทุกอย่าง ดู Dashboard ภาพรวม แก้ไขสถานะการจอง
  - `mechanic`: ดูรายการซ่อมและอัปเดตสถานะงาน
  - `customer`: จองคิว ดูประวัติการซ่อม และแก้ไขข้อมูลส่วนตัว
- **Security**: Login/Register ด้วย Email (Case-insensitive)

### 4. แดชบอร์ดและรายงาน (Dashboard & Reporting)
- แสดงสถิติรายได้ จำนวนการจอง และสถานะงานซ่อม
- กราฟแสดงแนวโน้มการใช้บริการ (Recharts)
- ประวัติการซ่อม (Service History) พร้อม Export ใบเสร็จเป็น PDF

### 5. ระบบอัตโนมัติ (Automation with n8n Cloud)
- **Chat Workflow**:
  - Webhook (POST) → IF ตรวจ X-N8N-SECRET → AI Agent (Groq) → Respond to Webhook
- **Booking Workflow**:
  - Webhook (POST) → IF ตรวจ X-N8N-SECRET → Move Binary Data (Base64→Binary) → Drive Upload → Sheets Append → Respond
- **Security**:
  - ใช้ header ลับ X-N8N-SECRET จาก Backend ตรวจที่ IF node
- **Production URL**:
  - Chat: ตัวอย่าง https://YOUR_SUBDOMAIN.n8n.cloud/webhook/37985a1c-1314-465f-b5fd-2e93bf474c75
  - Booking: ตัวอย่าง https://YOUR_SUBDOMAIN.n8n.cloud/webhook/confirm-booking

---

## 🚀 การติดตั้งและใช้งาน (Installation)

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL Database
- n8n (สำหรับรัน Workflow)

### 2. Environment Variables
- Local Development (`backend/.env`):
```env
PORT=5000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your_secret_key
N8N_SECRET=change_me
N8N_WEBHOOK_URL=https://YOUR_SUBDOMAIN.n8n.cloud/webhook/37985a1c-1314-465f-b5fd-2e93bf474c75
N8N_SHEETS_WEBHOOK_URL=https://YOUR_SUBDOMAIN.n8n.cloud/webhook/confirm-booking
FRONTEND_ORIGINS=https://project-motorbike.vercel.app
```
- Render (Backend):
  - N8N_SECRET, N8N_WEBHOOK_URL, N8N_SHEETS_WEBHOOK_URL, FRONTEND_ORIGINS
  - กด Save, rebuild and deploy ให้ค่าใหม่มีผล
- Supabase (Production):
  - ใช้ค่า `DATABASE_URL` ที่ Supabase ให้มา (รูปแบบตัวอย่าง)
  - `postgresql://postgres:<YOUR_PASSWORD>@db.<PROJECT_ID>.supabase.co:5432/postgres?sslmode=require`

### 3. การรันโปรเจกต์
ใช้คำสั่งเดียวเพื่อรันทั้ง Backend และ Frontend พร้อมกัน:
```bash
npm run dev
```
- **Backend**: http://localhost:5000
- **Frontend**: http://localhost:3000

---

## 📂 โครงสร้างโปรเจกต์ (Project Structure)

```
motorbike_project/
├── backend/                # Server-side logic
│   ├── config/             # DB configuration
│   ├── routes/             # API Endpoints (bookings, users, inventory)
│   ├── middleware/         # Auth & Validation
│   └── uploads/            # Local storage for temp files
├── frontend/               # Client-side Application
│   ├── src/app/            # Next.js App Router Pages
│   ├── src/components/     # Reusable UI Components
│   └── src/contexts/       # Global State (AuthContext)
└── package.json            # Project scripts & dependencies
```

---

## 🔌 API หลัก (Backend Endpoints)
- Authentication: `/api/auth` ดูที่ [auth.js](file:///c:/motorbike_project/backend/routes/auth.js)
- Users: `/api/users` ดูที่ [users.js](file:///c:/motorbike_project/backend/routes/users.js)
- Services: `/api/services` ดูที่ [services.js](file:///c:/motorbike_project/backend/routes/services.js)
- Bookings:
  - สร้าง/อ่าน/แก้สถานะ: `/api/bookings` ดูที่ [bookings.js](file:///c:/motorbike_project/backend/routes/bookings.js)
  - ลบการจองทั้งหมดของผู้ใช้ และรี sequence ID: `DELETE /api/bookings/user/:userId` (admin only)
- Notifications: `/api/notifications`
- Dashboard: `/api/dashboard` ดูที่ [dashboard.js](file:///c:/motorbike_project/backend/routes/dashboard.js)
- Chat AI: `/api/chat` ดูที่ [chat.js](file:///c:/motorbike_project/backend/routes/chat.js)

---

## 🗃 โครงสร้างฐานข้อมูล (สำคัญ)
- ตารางหลัก:
  - `users`, `vehicles`, `services`, `parts`, `bookings`, `booking_services`, `booking_parts`, `notifications`, `transactions`
- ตัวอย่าง schema ดูที่ [schema.sql](file:///c:/motorbike_project/backend/config/schema.sql)
- จุดเด่น:
  - ใช้ `SERIAL` สำหรับ primary key และตั้งค่า index ที่จำเป็น
  - ใช้ `ON DELETE CASCADE` ในตารางความสัมพันธ์ของ booking

---

## 🔐 ความปลอดภัย (Security)
- JWT ผ่าน header `x-auth-token` ตรวจใน [auth middleware](file:///c:/motorbike_project/backend/middleware/auth.js)
- CORS อนุญาต Vercel และ localhost ตามที่ตั้งค่าใน [server.js](file:///c:/motorbike_project/backend/server.js)
- Webhook ไป n8n Cloud ส่ง `X-N8N-SECRET` จาก `process.env.N8N_SECRET`
- แนะนำเปลี่ยน `N8N_SECRET` เป็นค่าสุ่มที่แข็งแรงก่อนใช้งานจริง

---

## ☁️ การดีพลอย (Deployment)
- Frontend: Vercel (NEXT_PUBLIC_API_URL ชี้ไป Render)
- Backend: Render (ตั้ง Environment Variables ให้ครบ)
- Automation: n8n Cloud (ใช้ Production URL แบบ https)
- Database: Supabase (PostgreSQL) เชื่อมต่อผ่าน `DATABASE_URL`
- Storage & Logging: Google Drive / Google Sheets ผ่าน n8n

---

## ✅ การทดสอบระบบ
- Chat:
  - ส่งข้อความจากหน้าเว็บ → Backend → n8n Cloud → ตอบกลับ
- Booking:
  - Admin เปลี่ยนสถานะเป็น `confirmed` → Backend ยิงไป n8n Cloud → Drive Upload → Sheets Append
- ตรวจผล:
  - Render Logs, n8n Executions, แถวใหม่ใน Google Sheet และไฟล์ใน Drive

---

## ℹ️ หมายเหตุการใช้งาน
- Webhook ของ n8n Cloud รองรับ `POST` เท่านั้น
- ถ้าแก้ Production URL ของ n8n ให้เปลี่ยนค่าที่ Render และ `.env` ให้ตรงกัน
