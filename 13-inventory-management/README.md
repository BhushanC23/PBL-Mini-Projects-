# 13 - Inventory Management System

A standalone, college-level Full-Stack mini-project for product CRUD, red Low Stock alerts (`quantity < 10`), and a dedicated API endpoint calculating total inventory value.

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

On first startup, if the `products` collection in `13-inventory-management` is empty, 5 sample products (including 2 Low Stock items) are automatically seeded.

## Features & REST APIs

- `GET /api/inventory/value` — Dedicated endpoint returning `totalValue`, `totalUnits`, `productCount`, and `lowStockCount`
- `GET /api/products` — List products (supports `?q=` search and `?lowStock=true`)
- `POST /api/products` — Add a product (blocks duplicate names with HTTP `409`)
- `PUT /api/products/:id` — Edit product details
- `DELETE /api/products/:id` — Delete a product
