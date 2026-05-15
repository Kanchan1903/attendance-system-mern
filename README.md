# Attendance System (MERN)

Full-stack attendance management: **React (Vite)** client, **Express** server, **MongoDB** database.

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

1. **Install dependencies**

   ```bash
   npm run install:all
   ```

2. **Environment**

   Copy `server/.env.example` to **`.env` in the project root** (same folder as this `README.md`) and set:

   - `MONGODB_URI` — Mongo connection string  
   - `JWT_SECRET` — strong secret for signing tokens  
   - `PORT` — API port (default `5000`)  
   - `CORS_ORIGIN` — e.g. `http://localhost:5173`  
   - `UPLOAD_DIR` — relative folder for uploads (default `uploads`)

3. **Run (development)**

   From the project root:

   ```bash
   npm install
   npm run dev
   ```

   This starts the API and the Vite dev server together. Alternatively, use two terminals:

   ```bash
   npm run dev:server
   npm run dev:client
   ```

4. **Open the app**

   - Frontend: [http://localhost:5173](http://localhost:5173)  
   - API health: [http://localhost:5000/api/health](http://localhost:5000/api/health)

## Production

```bash
npm run build
npm run start
```

Serve the `client/dist` output with any static host or reverse-proxy; point API requests to the Node server.

## Project layout

| Path       | Role                          |
|-----------|--------------------------------|
| `client/` | React SPA (Vite)              |
| `server/` | Express API + Mongoose      |
| `.env`    | Environment (root; not committed if secrets) |

## Legacy PHP / MySQL

This repository contains **only** the MERN stack. There is no PHP or MySQL code path in this project.
