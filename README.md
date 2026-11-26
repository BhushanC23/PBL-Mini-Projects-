<div align="center">

# 🚀 PBL Full-Stack Mini-Projects (15 Standalone Apps)

**A curated collection of 15 independent, college-level Full-Stack web applications built with Node.js, Express, MongoDB, Tailwind CSS, and Vanilla JavaScript.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.x-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-CDN-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Projects](https://img.shields.io/badge/Projects-15_Complete-4F46E5?style=for-the-badge)](#project-catalogue)

</div>

---

## ✨ Why This Repository?

Every folder in this repository is **100% self-contained and portable**:

- 📦 **Zero Shared Configs** — Copy any single folder to another machine and run it immediately.
- ⚡ **Zero `.env` Setup Needed** — Hardcoded local MongoDB fallback (`mongodb://127.0.0.1:27017/<project-folder>`) out of the box.
- 🌱 **Auto-Seeded Sample Data** — Automatically populates realistic starter records on first run if the database is empty.
- 🛡️ **Real-World Validations** — Duplicate blocking, capacity guards, double-booking prevention, date validation, stock limits, and JWT auth isolation.
- 🎨 **Clean Student-Ready UI** — Single-page responsive Tailwind CSS interfaces served directly by Express on `http://localhost:5000`.

---

## 🛠️ Prerequisites

- **[Node.js](https://nodejs.org/)** (`v18+` recommended)
- **[MongoDB](https://www.mongodb.com/)** running locally on `mongodb://127.0.0.1:27017`

> **Windows Tip:** If you get `ECONNREFUSED 127.0.0.1:27017`, start the MongoDB service in an Administrator terminal:
> ```powershell
> net start MongoDB
> ```

---

## ⚡ 2-Step Quick Start

Pick any project folder and run it independently:

```bash
cd <project-folder>
```

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Start the server:**
   ```bash
   npm start
   ```

Then open **`http://localhost:5000`** in your browser.

---

## 📚 Project Catalogue

| # | Project Folder | Application | Key Features & Backend Guards | MongoDB Database |
|:-:|:---|:---|:---|:---|
| 01 | [`01-student-portal`](./01-student-portal) | **Student Records Portal** | Full CRUD, live search (`?q=`), duplicate Roll No./Email guard (`409`), Pass/Fail badges (`>= 40`) | `01-student-portal` |
| 02 | [`02-online-bookstore`](./02-online-bookstore) | **Campus Online Bookstore** | 6 seeded books across 3 categories, category filters, persistent cart, stock guard, order checkout | `02-online-bookstore` |
| 03 | [`03-library-management`](./03-library-management) | **Library Management System** | Add/delete books, issue to members, atomic double-issue rejection (`409`), currently issued table & return | `03-library-management` |
| 04 | [`04-employee-leave`](./04-employee-leave) | **Employee Leave Portal** | Leave form with `endDate >= startDate` validation, inclusive day count, Admin Approve/Reject view | `04-employee-leave` |
| 05 | [`05-hospital-appointment`](./05-hospital-appointment) | **Hospital Appointment Booking** | Doctor & slot booking, strict double-booking rejection (`409` + unique index), upcoming schedule | `05-hospital-appointment` |
| 06 | [`06-online-quiz`](./06-online-quiz) | **Online MCQ Quiz** | 10 seeded MCQs, one-at-a-time navigation, 2-min countdown timer, server grading, `results` history | `06-online-quiz` |
| 07 | [`07-expense-tracker`](./07-expense-tracker) | **Income & Expense Tracker** | Monthly Income/Expense/Net Balance cards, month & category filters, full CRUD | `07-expense-tracker` |
| 08 | [`08-event-registration`](./08-event-registration) | **Event Registration Portal** | Client-side email & 10-digit mobile checks, duplicate email blocking (`409`), Admin registrants tab | `08-event-registration` |
| 09 | [`09-notes-auth`](./09-notes-auth) | **Private Notes & Blogs (Auth)** | `bcryptjs` hashing + `jsonwebtoken` (JWT) auth, strict per-user ownership isolation (`401`/`403`) | `09-notes-auth` |
| 10 | [`10-hostel-allocation`](./10-hostel-allocation) | **Hostel Room Allocation** | Add rooms, atomic capacity guard (`409`), vacant vs occupied filters, occupancy counts & vacate | `10-hostel-allocation` |
| 11 | [`11-job-portal`](./11-job-portal) | **Campus Job & Internship Portal** | Student View (title/location search & apply) + Recruiter View (post jobs & inspect applications) | `11-job-portal` |
| 12 | [`12-food-ordering`](./12-food-ordering) | **Campus Food Ordering** | 6 seeded menu items, `−`/`+` quantity controls, live bill calculator, order API & Order History | `12-food-ordering` |
| 13 | [`13-inventory-management`](./13-inventory-management) | **Inventory Management System** | Product CRUD, red **Low Stock** badges (`< 10` units), dedicated `GET /api/inventory/value` endpoint | `13-inventory-management` |
| 14 | [`14-complaint-management`](./14-complaint-management) | **Complaint & Feedback Portal** | Category & priority ticket form, Admin status filter & workflow (`Open`, `In Progress`, `Resolved`) | `14-complaint-management` |
| 15 | [`15-placement-portal`](./15-placement-portal) | **Campus Placement Portal** | Student profile registration, CGPA-gated active drives, Admin `Selected` / `Not Selected` marking | `15-placement-portal` |

---

## 📁 Folder Structure Pattern

Every project follows the exact same clean, standalone structure:

```text
<project-folder>/
├── public/
│   └── index.html      # Single-page UI (Tailwind CSS CDN + Vanilla JS fetch)
├── package.json        # Minimal dependencies (express, mongoose, cors [+ auth libs in 09])
├── server.js           # Express server, Mongoose schemas, auto-seeding & REST APIs
└── README.md           # Project-specific run steps & API summary
```

---

## 👤 Author

Maintained by **[BhushanC23](https://github.com/BhushanC23)** — built as a 15-project Full-Stack PBL mini-project suite.
