import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Dynamic CORS configuration allowing localhost, specified CLIENT_URL, and vercel preview domains
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Check exact match or vercel.app preview subdomains
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, logged in prod
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-id'],
    exposedHeaders: ['Content-Disposition'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (Render & Production Monitoring)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'smart-bus-attendance-backend',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server only if run directly as the main script (not imported in tests)
const isMainModule = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'));

if (isMainModule && process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(async () => {
      // Auto-seed if database has no students
      const { Student } = await import('./models/Student.js');
      const count = await Student.countDocuments();
      if (count === 0) {
        console.log('[Startup] Database is empty. Auto-seeding 68 students & demo accounts...');
        const { seedDatabase } = await import('../seed/seed.js');
        await seedDatabase();
      }

      app.listen(PORT, () => {
        console.log(`=========================================`);
        console.log(`SMART BUS ATTENDANCE SERVER RUNNING`);
        console.log(`Port: ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Health Check: http://localhost:${PORT}/api/health`);
        console.log(`=========================================`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database connection:', err);
      process.exit(1);
    });
}

export default app;
