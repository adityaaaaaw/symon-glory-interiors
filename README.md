<<<<<<< HEAD
# Glory Simon Interiors Site Visit Booking System

A professional, business-oriented **Site Visit Booking & Scheduling CRM** built for Glory Simon Interiors. Drawing design inspiration from professional tools like Linear and Notion, it delivers a clean, high-end, premium SaaS user experience in a strict **Light Theme** (white, slate, and gold accents).

---

## 🌟 Key Features

1. **Luxury Landing Page**: Incorporates 6 structured sections (Hero, How It Works, Services, Statistics, Testimonials, and Book Site Visit CTA) showcasing living room designs with custom gold branding.
2. **Smart Auto-Assignment Engine**: Intelligent matching of designers and site engineers to incoming bookings based on location proximity, workload bounds, and calendar conflicts. Staff marked as `Busy` or `On Leave` are automatically skipped.
3. **Calendar Scheduling Conflict Prevention**:
   - The engine automatically skips scheduling a professional if they have a scheduled visit at the same date and slot.
   - Manual override options validate availability on the backend, preventing double bookings on the same date/slot.
4. **Client Portal Dashboard**:
   - **My Bookings View**: Lists the client's site visits in a modern card grid, featuring Booking IDs (`GSI-YYYY-XXXX`), preferred slots, address coordinates, and status badges.
   - **Progress Stepper & Timeline**: Active tracking stepper along with a detailed vertical activity log showing booking creation, recommendations, and status updates.
   - **AI Visit Reports**: Displays structured summaries, recommendations, and follow-up actions once visits are completed.
5. **Admin CRM Overview**:
   - **5 KPI Metric Cards**: Shows Total Bookings, Today's Visits, Pending Visits, Completed Visits, and Cancelled Visits.
   - **Dashboard Quick Actions**: Clean actions tray for **New Booking**, **Assign Professional**, **Export CSV**, and **Download Reports**.
   - **Calendar View**: Displays visits labeled with unique Booking IDs.
   - **Staff Availability Manager**: Allows toggling status (`Available`, `Busy`, `On Leave`) to update the assignment engine dynamically.
6. **Command Search Palette (`Ctrl+K`)**: Openable via shortcut or navbar click to search clients or look up platform sections instantly.

---

## 🛠️ Tech Stack & Directory Structure

- **Frontend**: React, Vite, Tailwind CSS (v3), React Router DOM, Recharts, Lucide-React, Axios.
- **Backend**: Node.js, Express.js.
- **Database**: MySQL (configured via `database/database.sql` migrations).

```
internship-1/
├── package.json                   # Root package manager
├── README.md                      # Setup and execution guide
├── backend/                       # Express.js REST API
│   ├── package.json
│   ├── server.js                  # API Entry
│   ├── db.js                      # Database configurations (MySQL only with connection pooling)
│   ├── seed.js                    # Seeding engine (50 clients, 15 designers, 10 engineers, etc.)
│   └── database/
│       └── database.sql           # MySQL database schema migrations script
└── frontend/                      # React Vite Client
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx                # Layouts & routing
        ├── index.css              # Custom light theme styles
        ├── context/
        │   └── AppContext.jsx     # Auth state, commands, notifications context
        ├── components/            # Reusable UI components (Calendar, Palette, Notification)
        └── pages/                 # Landing Page, Client Portal, CRM, Booking Form
```

---

## 🚀 Getting Started

To run the application locally, follow these 3 steps:

### 1. Install Dependencies
Run the installation script in the root directory to set up both the backend and frontend modules:
```bash
npm run install-all
```

### 2. Seed the Database
Populate the database with the pre-configured dataset (50 Clients, 15 Designers, 10 Engineers, and 100 Bookings):
```bash
npm run seed
```

### 3. Run the Servers Concurrently
Start both the Vite development server and the Express API server concurrently:
```bash
npm run dev
```
- The React frontend will be accessible at: **[http://localhost:3000](http://localhost:3000)**
- The Express API backend runs at: **[http://localhost:5000](http://localhost:5000)**

---

## 🔑 Test Credentials
Click **Portal Login** on the landing page navbar and use the quick pre-fill buttons or log in manually with:

* **Admin CEO Role**:
  - Email: `ceo@glorysimon.com`
  - Password: `admin123`
* **Client Role**:
  - Email: (Click any client button or use a seeded email, e.g. `amit.sharma1@example.com`)
  - Password: `client123`
=======
# symon-glory-interiors
>>>>>>> 9438c9b9663c08cd5a338110cb7e9e2f37391f41
