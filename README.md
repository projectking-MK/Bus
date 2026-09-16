# Smart Bus Attendance Monitoring System 🚌

A secure, full-stack, anti-proxy attendance monitoring web application for a college bus with **55 registered students**. Students mark attendance using their mobile devices. The system enforces multi-layered server-side verification to prevent proxy marking: student account authentication, persistent hardware device fingerprint binding, dynamic 25-second rotating QR tokens, and real-time GPS geofencing via the Haversine distance algorithm against live bus coordinates.

---

## 📑 Table of Contents

1. [System Overview & Architecture](#-system-overview--architecture)
2. [Key Anti-Proxy Features](#-key-anti-proxy-features)
3. [Excel Attendance Report (.xlsx)](#-excel-attendance-report-xlsx)
4. [Feeding Student Data (Import Tool)](#-feeding-student-data-import-tool)
5. [Technology Stack](#-technology-stack)
6. [Project Structure](#-project-structure)
7. [Demo Accounts & Credentials](#-demo-accounts--credentials)
8. [Local Development Setup](#-local-development-setup)
9. [Database Seeding (55 Students)](#-database-seeding-55-students)
10. [Automated Testing](#-automated-testing)
11. [MongoDB Atlas Setup](#-mongodb-atlas-setup)
12. [Production Deployment Guide](#-production-deployment-guide)
    - [Backend on Render](#backend-deployment-render)
    - [Frontend on Vercel](#frontend-deployment-vercel)
13. [Troubleshooting & FAQs](#-troubleshooting--faqs)

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
                                  | 55 Students, Devices, |
                                  | Trips, QR & Audits    |
                                  +-----------------------+
```

### Multi-Role System
1. **ADMIN**: Roster management for all 55 students, feed/import new student data, reset device binding, configure geofence radius & route center coordinates, view real-time audit logs, and export verified attendance records as **Excel (`.xlsx`)** or CSV.
2. **BUS DRIVER**: Start/stop bus trip, stream live bus GPS coordinates, project dynamic QR code that automatically rotates every **20 minutes (1200s)** with live countdown progress, download high-res branded QR images to broadcast to student WhatsApp groups, and observe real-time passenger counts (present vs absent out of 55). Drivers cannot falsify student attendance.
3. **STUDENT**: Log in, bind hardware device identifier on first login, scan dynamic bus QR via camera or gallery upload (if received on WhatsApp), supply high-accuracy GPS coordinates, view personal attendance history and attendance percentage.

---

## 📊 Excel Attendance Report (.xlsx)

The system features an automated **Excel export generator** (`/api/admin/export-excel` powered by `exceljs`), styled and formatted for institutional attendance audits:

1. **Sheet 1: Summary & Absentee Analysis**:
   - **Executive KPI Cards**: Total Capacity (55), Total Present, Total Absent, Attendance Rate.
   - **Gender-Disaggregated Present Counts**: Number of **Boys Present** and number of **Girls Present**.
   - **Absent Boys Table**: Explicit list of every absent boy with **Student Name**, **Academic Year** (e.g., 2nd Year, 3rd Year), Roll Number, and Department.
   - **Absent Girls Table**: Explicit list of every absent girl with **Student Name**, **Academic Year**, Roll Number, and Department.
2. **Sheet 2: Detailed Roster (All 55 Students)**:
   - Full student registry with Roll No, Name, Gender (`Boy` / `Girl`), Academic Year, Department, Status (`PRESENT` / `ABSENT`), Verification Timestamp, Distance from Bus (m), GPS Accuracy (m), and Device Fingerprint.

You can download this report anytime with a single click from the **Admin Dashboard** or **Attendance Logs** page.

---

## 📥 Feeding Student Data (Import Tool)

You can easily feed your custom student data at any time using any of the following methods:

### Method 1: Web UI (Zero Code)
1. Log into the Admin Dashboard (`admin@college.edu` / `Admin@123`).
2. Go to **Students (55)** in the navigation.
3. Click the **Feed / Import Students** button at the top right.
4. Download the sample CSV template with one click.
5. Upload your `.csv` file or paste raw CSV text directly into the modal and click **Import Students**.

### Method 2: REST API (`POST /api/students/import`)
Send a `POST` request with your admin JWT token and an array of student records or a CSV string:
```json
{
  "students": [
    {
      "rollNumber": "24CS001",
      "name": "Kowshiek R",
      "email": "kowshiek@college.edu",
      "gender": "Male",
      "academicYear": "3rd Year",
      "department": "Computer Science",
      "password": "Student@123"
    }
  ]
}
```

### Method 3: Seed Script
Edit `backend/seed/seed.js` with your custom student records and run:
```bash
cd backend
npm run seed
```

---

## 🛡️ Key Anti-Proxy Features

The backend rejects attendance submissions that do not pass **all 14 validation criteria**:
- **Hardware Device Binding**: Each student account is bound to a single physical device fingerprint. If another student attempts to mark attendance from their phone using a friend's credentials, the request is blocked (`403 This account is registered to another device`).
- **Dynamic 20-Minute (1200s) QR Token with Download**: The QR code stays active for 20 minutes. The driver can project it on the bus dashboard or click **"Download QR Image"** to send it directly into the student WhatsApp group.
- **Concurrent Marking for All 55 Students**: All 55 students can scan and mark attendance simultaneously during the 20-minute validity window. Rate limiters are keyed per student ID, preventing collective throttling.
- **GPS Geofencing (Haversine Formula)**: Strictly enforced at all times. Compares student coordinates directly with the driver's live bus GPS coordinates. Even if a student receives the QR screenshot on WhatsApp at home, attendance is rejected (`400 You are outside the permitted bus area`) because they are outside the 100-meter bus radius!
- **Gallery/WhatsApp Image Scanner**: Students who receive the QR image on their phone can simply upload it directly from their gallery into the scanner without needing a second screen.
- **Single-Use Replay Protection**: An individual token cannot be scanned more than once by the same student.
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
  - `exceljs` (Formatted, styled multi-sheet Excel spreadsheet generation)
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
│   │   │   ├── Student.js            # 55 student records, gender, year, stats
│   │   │   ├── Device.js             # Device binding & hardware fingerprint
│   │   │   ├── Bus.js                # Bus metadata (capacity 55), geofence
│   │   │   ├── BusTrip.js            # Live trip status, current coordinates
│   │   │   ├── QRCode.js             # Dynamic rotating QR tokens with TTL
│   │   │   ├── Attendance.js         # Verified attendance records & coordinates
│   │   │   └── AuditLog.js           # Security and device reset audit log
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification & role authorization
│   │   │   └── rateLimiter.js        # DDoS & brute-force attendance protection
│   │   ├── controllers/
│   │   │   ├── authController.js     # Login & profile retrieval
│   │   │   ├── studentController.js  # CRUD, bulk import & stats for 55 students
│   │   │   ├── deviceController.js   # Device registration, matching & admin reset
│   │   │   ├── tripController.js     # Start/stop trip, driver location updates
│   │   │   ├── qrController.js       # Dynamic QR token generation & rotation
│   │   │   ├── attendanceController.js # 14-step anti-proxy attendance validation
│   │   │   └── adminController.js    # Dashboard metrics, Excel export, settings
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
│   │   │   ├── excelExporter.js      # Excel (.xlsx) generator with gender KPI & absent roster
│   │   │   └── csvExporter.js        # Attendance CSV generation
│   │   ├── server.js                 # Express server & API routes
│   │   └── tests/
│   │       └── attendance.test.js    # 14 security & Excel test suites
│   ├── seed/
│   │   └── seed.js                   # Seeds Admin, Driver, Bus, and 55 Students (21 Boys, 34 Girls)
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
│   │   │   │   ├── AdminDashboard.jsx # Summary cards, gender KPIs, Excel export
│   │   │   │   ├── StudentList.jsx    # Table of 55 students with device reset & bulk feed modal
│   │   │   │   ├── AttendanceLog.jsx  # Detailed logs with gender badge, Excel export
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

The system is configured for **55 registered students** (21 Boys and 34 Girls). Students can log in using their **Student Name** as username and their **name (lowercase without initial) + Department (uppercase)** as password:

### Staff Accounts
| Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `Admin@123` | Chief Administrator (Full access, Excel export, Student Feed) |
| **Driver** | `driver@college.edu` | `Driver@123` | Senior Driver (Bus #BUS-01 console, 55 capacity) |

#### Student Credentials Format
- **Username**: Student Name **without initial** (e.g. `Magila`, `Kowshiek`, `Hari`) or College Email (`student01@college.edu` to `student55@college.edu`)
- **Password**: Student Name in lowercase without initial + Department in uppercase (e.g. `magilaAIDS`, `kowshiekIT`, `hariECE`)

| # | Student Full Name | Username (No Initial) | Dept | Year | Gender | Password | Roll No |
| :- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Magila D | **Magila** | AIDS | 1st Year (I) | Female | `magilaAIDS` | 23CS001 |
| 2 | Sowmitha S | **Sowmitha** | ECE | 3rd Year (III) | Female | `sowmithaECE` | 23CS002 |
| 3 | Ramya V | **Ramya** | CSE | 3rd Year (III) | Female | `ramyaCSE` | 23CS003 |
| 4 | Kavya V P | **Kavya** | BME | 3rd Year (III) | Female | `kavyaBME` | 23CS004 |
| 5 | Parthiban G | **Parthiban** | CCE | 3rd Year (III) | Male | `parthibanCCE` | 23CS005 |
| ... | ... | ... | ... | ... | ... | ... | ... |
| 32 | Kowshiek R | **Kowshiek** | IT | 3rd Year (III) | Male | `kowshiekIT` | 23CS032 |
| 33 | S Hari | **Hari** | ECE | 2nd Year (II) | Male | `hariECE` | 23CS033 |
| 50 | Balah VM | **Balah** | ECE | 4th Year (IV) | Female | `balahECE` | 23CS050 |
| 52 | Kalpaka E | **Kalpaka** | BIO-TECH | 4th Year (IV) | Female | `kalpakaBIO-TECH` | 23CS052 |
| 55 | Niranjan S | **Niranjan** | CSE | 3rd Year (III) | Male | `niranjanCSE` | 23CS055 |

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js (v18 or v20+ recommended)
- npm (v9+)

### 2. Backend Setup
```bash
cd backend
npm install
npm run seed     # Seeds 1 Admin, 1 Driver, 1 Bus (55 cap), and 55 Students (21 Boys, 34 Girls)
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

Run the automated test suite to verify the security, anti-proxy rules, and Excel export:
```bash
cd backend
npm test
```

### Verified Test Scenarios (16 Comprehensive Tests):
1. **Haversine Distance**: Verifies accurate mathematical distance computation between coordinates (0m, ~55m, >500m).
2. **Trip Validation**: Blocks attendance if no active trip is running.
3. **Driver Trip Start**: Verifies trip creation and initial 20-minute (1200s) QR token generation.
4. **Dynamic QR**: Returns active valid token with countdown (1200s = 20 minutes).
5. **Valid Attendance**: Verifies successful attendance marking (`PRESENT`) with registered device within 100m.
6. **Anti-Proxy (Duplicate Prevention)**: Blocks duplicate submission on the same trip (`400 Attendance already marked for this trip`).
7. **Anti-Proxy (Device Mismatch)**: Blocks attempts to mark attendance from an unregistered phone (`403 This account is registered to another device`).
8. **Anti-Proxy (Expired QR)**: Blocks attendance using expired tokens (`400 QR code expired. Please scan the current QR`).
9. **Anti-Proxy (Geofence Distance)**: Blocks attendance when GPS coordinates are outside the permitted radius (`400 You are outside the permitted bus area`).
10. **Anti-Proxy (Low Accuracy)**: Blocks coarse location attempts (>100m GPS error).
11. **Role Enforcement**: Prevents drivers/admins from marking student attendance.
12. **Concurrent Attendance (55 Students)**: Verifies multiple students marking attendance simultaneously using the SAME 20-minute QR token.
13. **Anti-Proxy (Single Device Registration Lock)**: Prevents one physical device from being registered to multiple student accounts (`403 Anti-Proxy Security: This device is already registered to...`).
14. **Anti-Proxy (Single Device Trip Reuse Lock)**: Strictly blocks a physical device from marking attendance for more than one student on the same trip (`403 Anti-Proxy Violation: This device has already marked attendance for... on this trip`).
15. **Trip Stop**: Successfully closes attendance and recalculates attendance percentages.
16. **Excel (.xlsx) Export Verification**: Confirms generation of valid Excel binary spreadsheet with boys/girls present metrics, absent boys with name and year, and absent girls with name and year.

---

### 🛡️ Single-Device Anti-Proxy Protection (How It Works)

To prevent a student with a single phone from marking attendance ("putting present") for another friend:
1. **1:1 Hardware Fingerprint Lock**:
   - Each device generates a persistent, unique hardware identifier stored in client storage.
   - When a student logs in for the first time, this fingerprint is bound to their student record in MongoDB with a unique index.
   - If another student logs into their account on that same phone, the system rejects the device binding with HTTP 403.
2. **Trip-Level Device Single-Use Lock**:
   - On every active bus trip, the database and controller enforce that each physical `deviceId` can only record attendance **once**.
   - Even if someone attempts to switch accounts, the server catches that the device ID was already used on the active trip and immediately blocks attendance with HTTP 403 (`Anti-Proxy Violation: This device has already marked attendance for <RollNumber> on this trip`).
3. **Local Testing Tip**:
   - If you are testing locally on a single computer or laptop, two tabs in the same browser window share the same `localStorage` (simulating the **same phone** — and the anti-proxy system will rightfully block the second student!).
   - To simulate **two different physical phones**, test one student in a normal browser window and the second student in an **Incognito / Private window** (or a second browser such as Chrome and Edge).

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
   - `QR_EXPIRY_SECONDS`: `1200`
   - `DEFAULT_GEOFENCE_RADIUS`: `100`
6. Click **Create Web Service**.
7. Once deployed, verify health check at:
   `https://your-backend.onrender.com/api/health` -> `{"status":"ok"}`
8. Seed the 55 students on Render: Under Render service -> **Shell**, run:
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
  If a student switches to a new phone, the Admin must log in, navigate to **Students (55)**, and click the **Reset Device** icon for that student.
- **CORS Errors**:
  Ensure `CLIENT_URL` in the backend environment variables matches your frontend domain (e.g., `https://smart-bus-attendance.vercel.app`).
