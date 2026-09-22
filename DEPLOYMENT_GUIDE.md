# Firebase Deployment Guide — Vehicle Rental Management System

Your codebase has been fully prepared for **Firebase Hosting** and **Firebase Cloud Functions**.

---

## 📁 Files Created for Firebase Integration:

1. **`firebase.json`**: Configures Firebase Hosting to serve `/public` static files and rewrites all `/api/*` traffic to the Cloud Function API.
2. **`.firebaserc`**: Project configuration alias file.
3. **`functions/index.js`**: Wraps the Express.js server as a serverless Firebase Cloud Function (`exports.api`).
4. **`functions/package.json`**: Dependencies required for running Express in Cloud Functions.

---

## 🚀 Step-by-Step Deployment Instructions

### Step 1: Install Firebase CLI
Run this command once in your terminal:
```bash
npm install -g firebase-tools
```

### Step 2: Log in to Firebase
```bash
firebase login
```
*This will open your web browser to authenticate with your Google/Firebase account.*

### Step 3: Link Your Firebase Project
Replace `your-firebase-project-id` in [.firebaserc](file:///c:/Users/laksh/Desktop/vehical%20rent/.firebaserc) with your actual Firebase Project ID from the [Firebase Console](https://console.firebase.google.com/), or run:
```bash
firebase use --add
```

### Step 4: Deploy Everything
Run this command to publish your site and Cloud Functions to the web:
```bash
firebase deploy
```

---

## 🌐 Live Output
Once deployment completes, Firebase will provide your live website URL:
`https://<your-project-id>.web.app`

- **Static Pages**: `https://<your-project-id>.web.app/index.html`
- **Cloud Functions API**: `https://<your-project-id>.web.app/api/health`
