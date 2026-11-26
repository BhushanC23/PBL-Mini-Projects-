# 12 - Campus Food Ordering

A standalone, college-level Full-Stack mini-project with an auto-seeded food menu, quantity selector with automatic total bill calculation, order placement API, and persistent Order History.

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

On first startup, if empty, `server.js` seeds 6 food menu items (`Meals`, `Snacks`, `Beverages`) and 2 sample orders into `12-food-ordering`.

## Features & REST APIs

- `GET /api/menu` — Fetch auto-seeded food menu items (optional `?category=`)
- `GET /api/orders` — Fetch Order History sorted newest first
- `POST /api/orders` — Validates customer details and quantities, computes total bill server-side from DB prices, and saves the order
- `DELETE /api/orders/:id` — Delete an order
