# Smart Bus Attendance Monitoring System 🚌

A secure, full-stack, anti-proxy attendance monitoring web application for a college bus with **68 registered students**. Students mark attendance using their mobile devices. The system enforces multi-layered server-side verification to prevent proxy marking: student account authentication, persistent hardware device fingerprint binding, dynamic 25-second rotating QR tokens, and real-time GPS geofencing via the Haversine distance algorithm against live bus coordinates.

---

## 📑 Table of Contents

1. [System Overview & Architecture](#-system-overview--architecture)
2. [Key Anti-Proxy Features](#-key-anti-proxy-features)
3. [Technology Stack](#-technology-stack)
4. [Project Structure](#-project-structure)
5. [Demo Accounts & Credentials](#-demo-accounts--credentials)
6. [Local Development Setup](#-local-development-setup)
7. [Database Seeding (68 Students)](#-database-seeding-68-students)
8. [Automated Testing](#-automated-testing)
9. [MongoDB Atlas Setup](#-mongodb-atlas-setup)
10. [Production Deployment Guide](#-production-deployment-guide)
    - [Backend on Render](#backend-deployment-render)
    - [Frontend on Vercel](#frontend-deployment-vercel)
11. [Troubleshooting & FAQs](#-troubleshooting--faqs)

---

## 🌐 System Overview & Architecture

```
                                  +-----------------------+
                                  |   Frontend (Vercel)   |
                                  |  React 18 + Vite +    |
                                  |  TailwindCSS / Lucide |
                                  +-----------+-----------+
                                              |
                        HTTPS REST APIs       | Camera & Geolocation APIs
                                              v
                                  +-----------------------+
                                  |   Backend (Render)    |
                                  |  Node.js + Express    |
                                  |  JWT, bcryptjs, CORS  |
                                  +-----------+-----------+
                                              |
                                      Mongoose Driver
                                              v
                                  +-----------------------+
                                  | Database (Atlas/Local)|
                                  | 68 Students, Devices, |
                                  | Trips, QR & Audits    |
                                  +-----------------------+
```

### Multi-Role System
1. **ADMIN**: Roster management for all 68 students, reset device binding, configure geofence radius & route center coordinates, view real-time audit logs, and export verified attendance records as CSV.
2. **BUS DRIVER**: Start/stop bus trip, stream live bus GPS coordinates, project dynamic QR code that automatically rotates every 25 seconds with live countdown progress, and observe real-time passenger counts (present vs absent). Drivers cannot falsify student attendance.
3. **STUDENT**: Log in, bind hardware device identifier on first login, scan dynamic bus QR via device camera, supply high-accuracy GPS coordinates, view personal attendance history and attendance percentage.

---

## 🛡️ Key Anti-Proxy Features

The backend rejects attendance submissions that do not pass **all 14 validation criteria**:
- **Hardware Device Binding**: Each student account is bound to a single physical device fingerprint. If another student attempts to mark attendance from their phone using a friend's credentials, the request is blocked (`403 This account is registered to another device`).
- **Dynamic 25-Second QR Token**: The QR code displayed on the bus rotates every 25 seconds with an ephemeral token. Static screenshots forwarded over WhatsApp or messaging apps expire before they can be used.
- **Single-Use Replay Protection**: An individual token cannot be scanned more than once by the same student.
- **GPS Geofencing (Haversine Formula)**: Compares student coordinates directly with the driver's live bus GPS coordinates. If the student is outside the permitted radius (default 100 meters), attendance is rejected (`400 You are outside the permitted bus area`).
- **GPS Accuracy Check**: Rejects coarse cell tower estimations (>100m accuracy) requiring genuine high-accuracy device GPS.
- **Trip Status & Compound Uniqueness**: Attendance can only be recorded while `trip.status === 'ACTIVE'`. A database compound index on `{ studentId: 1, tripId: 1 }` guarantees duplicate submissions for the same trip are rejected.
- **Authoritative Server Timestamp**: Attendance records are stamped using the server clock, preventing client-side clock tampering.

---

## 🛠 Technology Stack

- **Frontend**:
  - React 18 & Vite
  - Tailwind CSS
  - Lucide React (Modern icons)
  - `html5-qrcode` (Mobile camera QR viewfinder with testing fallback)
  - Browser Geolocation API (`enableHighAccuracy: true`)
  - Axios HTTP client with JWT & device-ID interceptors
- **Backend**:
  - Node.js & Express.js
  - Mongoose ODM & MongoDB
  - JSON Web Tokens (`jsonwebtoken`)
  - `bcryptjs` password hashing
  - `express-rate-limit` DDoS & submission spam protection
  - `mongodb-memory-server` (Zero-friction local dev & automated testing fallback)
- **Database**:
  - MongoDB (Atlas in production, local MongoDB or In-Memory fallback in development)

---

## 📂 Project Structure

```
smart-bus-attendance/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # MongoDB connection & Memory Server fallback
│   │   ├── models/
│   │   │   ├── User.js               # Auth credentials (Admin, Driver, Student)
│   │   │   ├── Student.js            # 68 student records, roll numbers, stats
│   │   │   ├── Device.js             # Device binding & hardware fingerprint
│   │   │   ├── Bus.js                # Bus metadata, default geofence & route
│   │   │   ├── BusTrip.js            # Live trip status, current coordinates
│   │   │   ├── QRCode.js             # Dynamic rotating QR tokens with TTL
│   │   │   ├── Attendance.js         # Verified attendance records & coordinates
│   │   │   └── AuditLog.js           # Security and device reset audit log
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification & role authorization
│   │   │   └── rateLimiter.js        # DDoS & brute-force attendance protection
│   │   ├── controllers/
│   │   │   ├── authController.js     # Login & profile retrieval
│   │   │   ├── studentController.js  # CRUD & stats for 68 students
│   │   │   ├── deviceController.js   # Device registration, matching & admin reset
│   │   │   ├── tripController.js     # Start/stop trip, driver location updates
│   │   │   ├── qrController.js       # Dynamic QR token generation & rotation
│   │   │   ├── attendanceController.js # 14-step anti-proxy attendance validation
│   │   │   └── adminController.js    # Dashboard metrics, CSV export, settings
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── studentRoutes.js
│   │   │   ├── deviceRoutes.js
│   │   │   ├── tripRoutes.js
│   │   │   ├── qrRoutes.js
│   │   │   ├── attendanceRoutes.js
│   │   │   └── adminRoutes.js
│   │   ├── utils/
│   │   │   ├── geofence.js           # Haversine distance calculator
│   │   │   └── csvExporter.js        # Attendance CSV generation
│   │   ├── server.js                 # Express server & API routes
│   │   └── tests/
│   │       └── attendance.test.js    # 12+ security test suites
│   ├── seed/
│   │   └── seed.js                   # Seeds Admin, Driver, Bus, and 68 Students
│   ├── render.yaml                   # Render deployment blueprint
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axiosClient.js        # Configured Axios with JWT & device interceptors
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Role-aware header & user status
│   │   │   ├── QRScanner.jsx         # Camera-based live QR scanner with permissions
│   │   │   ├── DynamicQRDisplay.jsx  # Driver screen with 25s auto-refresh & countdown
│   │   │   ├── ProtectedRoute.jsx    # Role-based route guard
│   │   │   └── StatusBadge.jsx       # PRESENT, LATE, ABSENT badges
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Auth state, device registration persistence
│   │   ├── pages/
│   │   │   ├── Login.jsx             # Unified sleek login with 1-click demo accounts
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.jsx # Summary cards, active trip status, live counts
│   │   │   │   ├── StudentList.jsx    # Complete table of 68 students with device reset
│   │   │   │   ├── AttendanceLog.jsx  # Detailed logs with GPS, device ID, CSV export
│   │   │   │   └── TripConfig.jsx     # Geofence radius & route center setup
│   │   │   ├── driver/
│   │   │   │   └── DriverDashboard.jsx# Trip controller, large QR, passenger counts
│   │   │   └── student/
│   │   │       ├── StudentDashboard.jsx# Mobile card, device status, attendance history
│   │   │       └── ScanAttendance.jsx  # Camera scanner, GPS lock, verification flow
│   │   ├── utils/
│   │   │   ├── deviceFingerprint.js   # Reliable client device identification
│   │   │   └── geolocation.js         # Browser GPS with high accuracy & error handlers
│   │   ├── App.jsx                   # SPA Router
│   │   ├── main.jsx
│   │   └── index.css                 # Tailwind CSS styles
│   ├── vercel.json                   # Production SPA redirect config
│   ├── .env.example
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## 🔑 Demo Accounts & Credentials

The system includes pre-configured demo accounts for instant testing:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `Admin@123` | Chief Administrator (Full access) |
| **Driver** | `driver@college.edu` | `Driver@123` | Senior Driver (Bus #BUS-01 console) |
| **Student 1** | `student01@college.edu` | `Student@123` | Roll No: `23CS001` (Aarav Sharma) |
| **Student 2** | `student02@college.edu` | `Student@123` | Roll No: `23CS002` (Aditi Rao) |
| **Student 3** | `student03@college.edu` | `Student@123` | Roll No: `23CS003` (Akash Patel) |
| ... | ... | ... | ... |
| **Student 68** | `student68@college.edu` | `Student@123` | Roll No: `23CS068` (Vikram Joshi) |

> 💡 **Tip**: On the Login screen, click any of the demo shortcut buttons (**Admin**, **Driver**, **Student 01**, **Student 02**) to populate credentials instantly.

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js (v18 or v20+ recommended)
- npm (v9+)

### 2. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds 1 Admin, 1 Driver, 1 Bus, and 68 Students
npm run dev      # Runs backend at http://localhost:5000
```
> **Note on MongoDB**: If you have a local MongoDB daemon or MongoDB Atlas URI, specify it in `backend/.env`. If you do not have MongoDB installed locally, the backend automatically boots a zero-config In-Memory MongoDB server during development!

### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev      # Launches Vite dev server at http://localhost:5173
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Testing

Run the automated test suite to verify the security and anti-proxy rules:
```bash
cd backend
npm test
```

### Verified Test Scenarios:
1. **Haversine Distance**: Verifies accurate mathematical distance computation between coordinates (0m, ~55m, >500m).
2. **Trip Validation**: Blocks attendance if no active trip is running.
3. **Driver Trip Start**: Verifies trip creation and initial 25s QR token generation.
4. **Valid Attendance**: Verifies successful attendance marking (`PRESENT`) with registered device within 100m.
5. **Anti-Proxy (Duplicate Prevention)**: Blocks duplicate submission on the same trip (`400 Attendance already marked for this trip`).
6. **Anti-Proxy (Device Mismatch)**: Blocks attempts to mark attendance from an unregistered phone (`403 This account is registered to another device`).
7. **Anti-Proxy (Expired QR)**: Blocks attendance using expired tokens (`400 QR code expired. Please scan the current QR`).
8. **Anti-Proxy (Geofence Distance)**: Blocks attendance when GPS coordinates are outside the permitted radius (`400 You are outside the permitted bus area`).
9. **Anti-Proxy (Low Accuracy)**: Blocks coarse location attempts (>100m GPS error).
10. **Role Enforcement**: Prevents drivers/admins from marking student attendance.
11. **Trip Stop**: Successfully closes attendance and recalculates attendance percentages.

---

## ☁️ MongoDB Atlas Setup

For production deployment:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up/log in.
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, add a database user (e.g., `bus_admin`) with password.
4. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere).
5. Click **Connect** -> **Drivers** (Node.js) and copy the connection string:
   ```
   mongodb+srv://bus_admin:<password>@cluster0.abcde.mongodb.net/smart-bus-attendance?retryWrites=true&w=majority
   ```
6. Set this as `MONGODB_URI` in your backend environment variables.

---

## 🚀 Production Deployment Guide

### Backend Deployment (Render)
1. Push this repository to GitHub.
2. Log into [Render](https://render.com) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `smart-bus-attendance-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Configure Environment Variables in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET`: `<A secure random string>`
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
   - `QR_EXPIRY_SECONDS`: `25`
   - `DEFAULT_GEOFENCE_RADIUS`: `100`
6. Click **Create Web Service**.
7. Once deployed, verify health check at:
   `https://your-backend.onrender.com/api/health` -> `{"status":"ok"}`
8. Seed the 68 students on Render: Under Render service -> **Shell**, run:
   ```bash
   npm run seed
   ```

### Frontend Deployment (Vercel)
1. Log into [Vercel](https://vercel.com) and click **Add New...** -> **Project**.
2. Select your repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
4. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com` (Your deployed Render backend URL, without trailing slash)
5. Click **Deploy**.
6. Vercel will build the SPA and provide an HTTPS URL (e.g., `https://smart-bus-attendance.vercel.app`).
   > 🔒 **HTTPS Note**: Modern mobile browsers require HTTPS for camera and geolocation APIs, which Vercel provides automatically out of the box!

---

## ❓ Troubleshooting & FAQs

- **Camera Permission Denied**:
  If the student's browser blocks camera access, enable camera permissions in site settings or use the fallback manual token entry provided on the attendance screen.
- **GPS Accuracy Error**:
  Ensure the device's location service is set to "High Accuracy" (GPS + WiFi). Cellular-only location in low-reception areas may exceed the 100m threshold.
- **Device Mismatch Error**:
  If a student switches to a new phone, the Admin must log in, navigate to **Students (68)**, and click the **Reset Device** icon for that student.
- **CORS Errors**:
  Ensure `CLIENT_URL` in the backend environment variables matches your frontend domain (e.g., `https://smart-bus-attendance.vercel.app`).
