# Step-by-Step Hosting Guide: Render (Backend) + Firebase (Frontend)

This document provides complete instructions for hosting the **Frontend Web GUI on Firebase Hosting** and the **Backend Express API & Database on Render**.

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                 Firebase Hosting (Frontend)                 │
│  Serves HTML, CSS, JavaScript files via Global CDN           │
│  URL: https://<your-firebase-project-id>.web.app           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Cross-Origin HTTPS API Requests (CORS)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Render Web Service (Backend API)              │
│  Runs Express.js server & Node.js environment               │
│  URL: https://<your-render-service>.onrender.com            │
└──────────────────────────────┬──────────────────────────────┘
                               │ SQL Queries
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Database (Render MySQL / SQLite)              │
│  Holds 3NF Relational Tables & Records                      │
└─────────────────────────────────────────────────────────────┘
```

---

## PART 1: Deploy Backend API on Render

### Step 1.1: Push Project to GitHub
1. Commit your codebase to a private or public GitHub repository.

### Step 1.2: Create Web Service on Render
1. Log in to [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Configure service settings:
   - **Name**: `vehicle-rental-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Environment Variables:
   - `PORT`: `10000`
   - `JWT_SECRET`: `super_secret_key_2026`
   - `DB_ENGINE`: `auto` *(or `mysql` if connecting to external MySQL)*
6. Click **Create Web Service**.
7. Render will build and deploy your API. Copy your live Render URL (e.g. `https://vehicle-rental-backend.onrender.com`).

---

## PART 2: Configure Frontend for Render URL

### Step 2.1: Update `public/js/api.js`
Open [public/js/api.js](file:///c:/Users/laksh/Desktop/vehical%20rent/public/js/api.js) and set your Render URL on Line 2:

```javascript
const RENDER_BACKEND_URL = 'https://your-render-service.onrender.com/api';
```

---

## PART 3: Deploy Frontend on Firebase Hosting

### Step 3.1: Install & Login to Firebase CLI
Run in terminal:
```bash
npm install -g firebase-tools
firebase login
```

### Step 3.2: Initialize Firebase
Run inside your project directory:
```bash
firebase init hosting
```
- Select project or create new project.
- Public directory: `public`
- Single-page app: `Yes`

### Step 3.3: Deploy Frontend
Run:
```bash
firebase deploy --only hosting
```

Your frontend is now live on Firebase Hosting (e.g., `https://your-project.web.app`) and dynamically communicating with your Render backend!
