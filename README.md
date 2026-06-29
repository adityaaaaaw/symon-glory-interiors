# Glory Simon Interiors — Site Visit Booking System

A full-stack, production-ready **Site Visit Booking System** for Glory Simon Interiors — an interior design company. Built with React (Vite), Node.js/Express, MySQL, and Firebase.

---

## 🏗️ Project Structure

```
glory-simon-booking/
├── backend/               # Node.js + Express REST API
│   ├── src/
│   │   ├── config/        # MySQL pool, Firebase init
│   │   ├── controllers/   # Business logic (9 controllers)
│   │   ├── middleware/    # JWT auth, RBAC, validation
│   │   ├── routes/        # API route definitions (9 route files)
│   │   ├── services/      # Email, WhatsApp, Firebase, AI
│   │   ├── utils/         # JWT, bcrypt, PDF generator, priority engine
│   │   └── app.js         # Express entry point
│   ├── scripts/
│   │   ├── initDb.js      # Create database + run schema
│   │   └── seed.js        # Populate with sample data
│   ├── database.sql       # Full MySQL schema (16 tables)
│   └── .env.example       # Environment variables template
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── assets/        # Global CSS design system
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # Auth + Notification contexts
│   │   ├── layouts/       # Role-specific layouts
│   │   ├── pages/         # All page components
│   │   └── services/      # API client (fetch wrapper)
│   └── index.html
├── run.bat                # Start both servers (Windows)
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js >= 18.0.0
- MySQL 8.0+
- npm >= 9.0.0

### 1. Clone / Navigate to Project
```bash
cd "glory-simon-booking"
```

### 2. Setup MySQL Database
```bash
# Create database and run schema
mysql -u root -p < backend/database.sql
```
Or use the init script:
```bash
cd backend
cp .env.example .env
# Fill in DB_PASSWORD in .env
npm install
npm run db:init
```

### 3. Configure Environment
```bash
cd backend
cp .env.example .env
```
Edit `.env` with your MySQL credentials and SMTP settings.

### 4. Seed Sample Data
```bash
cd backend
npm run seed
```
This creates: 1 Admin, 3 Designers, 3 Site Engineers, 10 Clients, 60 days of slots, 20 bookings.

### 5. Start Backend
```bash
cd backend
npm run dev
# API running at http://localhost:5000
```

### 6. Start Frontend
```bash
cd frontend
npm install
npm run dev
# App running at http://localhost:5173
```

### 7. Or run both at once (Windows)
```
Double-click run.bat
```

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@glorysimon.com | Admin@Glory123 |
| **Designer** | priya.design@glorysimon.com | Glory@123 |
| **Designer** | karthik.design@glorysimon.com | Glory@123 |
| **Designer** | sneha.design@glorysimon.com | Glory@123 |
| **Site Engineer** | raj.engineer@glorysimon.com | Glory@123 |
| **Site Engineer** | anand.engineer@glorysimon.com | Glory@123 |
| **Site Engineer** | divya.engineer@glorysimon.com | Glory@123 |
| **Client** | client01@gmail.com | Client@123 |
| **Client** | client02@gmail.com | Client@123 |
| *(10 clients total)* | client01–10@gmail.com | Client@123 |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5 |
| Styling | Vanilla CSS (luxury HSL theme, glassmorphism) |
| Backend | Node.js 18+, Express 4 |
| Database | MySQL 8.0 (mysql2, raw SQL, no ORM) |
| Auth | JWT (24hr expiry), bcrypt (10 rounds) |
| Email | Nodemailer (SMTP) |
| WhatsApp | Template-based (stored in DB, Twilio-ready) |
| Firebase | Firebase Admin SDK (Cloud Messaging) |
| PDF | PDFKit |
| Testing | Jest + Supertest |

---

## 👥 User Roles

| Role | Access |
|---|---|
| **Admin** | Full system access, bookings management, staff assignment, calendar, reports, user management |
| **Client** | Register, book visits, view history, track status, reschedule, cancel |
| **Designer** | View assigned visits, submit visit reports, measurements, design suggestions |
| **Site Engineer** | View assigned visits, submit inspection notes, measurements, photos |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Client registration |
| POST | `/api/auth/login` | Login (all roles) |
| GET | `/api/auth/me` | Current user profile |
| GET | `/api/bookings` | List bookings (Admin/Staff) |
| POST | `/api/bookings` | Create booking (Client) |
| GET | `/api/bookings/my` | Client's own bookings |
| PATCH | `/api/bookings/:id/status` | Update status |
| PATCH | `/api/bookings/:id/cancel` | Cancel booking |
| PATCH | `/api/bookings/:id/reschedule` | Reschedule booking |
| GET | `/api/slots?date=` | Get available slots |
| POST | `/api/slots` | Create slot (Admin) |
| POST | `/api/assignments` | Assign staff (Admin) |
| POST | `/api/reports` | Submit visit report |
| GET | `/api/reports/booking/:id/export` | Export PDF |
| GET | `/api/dashboard/admin` | Admin metrics |
| GET | `/api/dashboard/conversion` | Conversion funnel |
| GET | `/api/calendar?view=&date=` | Calendar data |
| GET | `/api/notifications` | User notifications |
| POST | `/api/ai/priority` | Detect booking priority |
| POST | `/api/ai/summary` | Generate visit summary |

---

## 🗄️ Database Schema

16 tables with proper FK constraints and indexes:

`roles` → `users` → `clients` / `designers` / `site_engineers`
`project_types` → `bookings` → `slots`
`bookings` → `assignments` → `visit_reports` → `measurements` + `site_photos`
`users` → `notifications` + `activity_logs`
`bookings` → `followups` + `quotations`

---

## 🔔 Notifications

| Type | Trigger | Channel |
|------|---------|---------|
| Booking Confirmation | On booking creation | Email + WhatsApp + In-App |
| Booking Approval | Status → Confirmed | Email + In-App |
| Staff Assignment | Staff assigned | Email + In-App (staff) |
| Visit Reminder | 24hr before visit | Email + WhatsApp |
| Completion | Status → Completed | Email + In-App |

---

## 🤖 AI / Rule-Based Features

| Feature | Logic |
|---------|-------|
| Priority Detection | Budget × Property Type × Room Count → Low/Medium/High/Urgent |
| Visit Summary | Auto-generate professional report from observations + measurements |
| Confirmation Message | Template-based booking confirmation text |
| Reminder Message | Visit reminder with checklist |
| Follow-up Recommendations | Budget-tier based action items |

---

## 🧪 Running Tests

```bash
cd backend
npm test
```

Test files: `tests/auth.test.js`, `tests/booking.test.js`, `tests/slot.test.js`, `tests/integration.test.js`

---

## 📦 Environment Variables

See `backend/.env.example` for full list. Key variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=glory_simon_booking
JWT_SECRET=your_secret_key
SMTP_USER=your@email.com
SMTP_PASSWORD=your_app_password
FIREBASE_PROJECT_ID=your-project-id
```

---

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment guide.

---

*Glory Simon Interiors — Transforming spaces, crafting experiences.*
