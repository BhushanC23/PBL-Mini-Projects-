# 01 - Student Records Portal

A standalone, college-level Full-Stack mini-project to add, view, update, and delete student records with live search and automatic Pass/Fail status badges (`Pass >= 40`).

## Tech Stack

- **Backend:** Node.js, Express.js, Mongoose (MongoDB)
- **Frontend:** Single-page HTML (`public/index.html`) with Tailwind CSS (CDN) & Vanilla JavaScript (`fetch`)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- Local MongoDB running on `mongodb://127.0.0.1:27017`

## Run Steps

```bash
npm install
npm start
```

Open `http://localhost:5000` in your browser.

On first startup, if the `students` collection in `01-student-portal` is empty, 5 sample student records are automatically seeded.

## Features

- **CRUD Operations:** Add, view, edit, and delete student records (`Roll No.`, `Name`, `Class`, `Marks`, `Email`).
- **Validation:** Blocks empty fields, marks outside `0–100`, invalid emails, and duplicate Roll No. or Email entries with clear on-screen error banners.
- **Live Search:** Instant search across Roll No., Name, Class, and Email.
- **Pass/Fail Indicator:** Responsive table showing green `Pass` (`marks >= 40`) and red `Fail` (`marks < 40`) badges.
