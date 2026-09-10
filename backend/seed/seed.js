import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Student } from '../src/models/Student.js';
import { Bus } from '../src/models/Bus.js';
import { Device } from '../src/models/Device.js';
import { BusTrip } from '../src/models/BusTrip.js';
import { QRCode } from '../src/models/QRCode.js';
import { Attendance } from '../src/models/Attendance.js';
import { AuditLog } from '../src/models/AuditLog.js';

dotenv.config();

const studentNames = [
  'Aarav Sharma', 'Aditi Rao', 'Akash Patel', 'Ananya Iyer', 'Arjun Menon',
  'Bhavna Joshi', 'Chetan Verma', 'Deepa Nair', 'Devendra Reddy', 'Divya Sundaram',
  'Gautam Pillai', 'Gayatri Kapoor', 'Harish Chandra', 'Hemalatha K', 'Ishan Deshmukh',
  'Janani S', 'Jitendra Das', 'Kalyan Raman', 'Karthik Subramanian', 'Kavitha N',
  'Kishore Kumar', 'Lakshmi Narayanan', 'Madhavan R', 'Meera Bhatt', 'Manoj Tiwari',
  'Namrata Sen', 'Naveen Raj', 'Niharika Roy', 'Nirmal Prabhu', 'Pavithra M',
  'Pradeep Hegde', 'Pranav Anand', 'Preethi V', 'Rahul Mehra', 'Rajeshwari B',
  'Rakesh Nair', 'Ramesh Krishnan', 'Renu Mathur', 'Rishabh Sinha', 'Riya Mukherjee',
  'Rohan Gupta', 'Rohini Paul', 'Sachin Tendulkar', 'Sai Prasad', 'Sameer Saxena',
  'Sandhya V', 'Sanjay Dutt', 'Santhosh Babu', 'Saranya G', 'Shankar Mahadevan',
  'Shalini Mohan', 'Sharath K', 'Shilpa Shetty', 'Shivakumar V', 'Shruti Haasan',
  'Siddharth Roy', 'Sneha Reddy', 'Srinivas Raghavan', 'Suresh Raina', 'Swathi Sundar',
  'Tanvi Jain', 'Tarun Chawla', 'Umesh Yadav', 'Vaishnavi R', 'Varun Dhawan',
  'Venkatesh Prasad', 'Vignesh Shivan', 'Vikram Joshi'
];

const departments = [
  'Computer Science & Engineering',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
];

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await Bus.deleteMany({});
    await Device.deleteMany({});
    await BusTrip.deleteMany({});
    await QRCode.deleteMany({});
    await Attendance.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[Seed] Creating Admin User...');
    const adminUser = await User.create({
      name: 'Dr. S. Ramanathan (Chief Admin)',
      email: 'admin@college.edu',
      password: 'Admin@123',
      role: 'ADMIN',
      phone: '+91 94440 12345',
      isActive: true,
    });

    console.log('[Seed] Creating Bus Driver User...');
    const driverUser = await User.create({
      name: 'Mr. Muthuvel K (Senior Driver)',
      email: 'driver@college.edu',
      password: 'Driver@123',
      role: 'DRIVER',
      phone: '+91 98410 98765',
      isActive: true,
    });

    console.log('[Seed] Creating Bus Vehicle...');
    const bus = await Bus.create({
      busNumber: 'BUS-01',
      routeName: 'Main Campus Express Route 4 (Tambaram - Campus)',
      capacity: 68,
      defaultGeofenceRadius: 100, // 100 meters
      defaultCenterLatitude: 13.0827,
      defaultCenterLongitude: 80.2707,
      isActive: true,
    });

    console.log(`[Seed] Generating 68 Registered Students...`);
    const studentUsers = [];
    const students = [];

    for (let i = 1; i <= 68; i++) {
      const padNum = String(i).padStart(3, '0');
      const rollNumber = `23CS${padNum}`;
      const name = studentNames[i - 1] || `Student Demo ${padNum}`;
      const email = `student${String(i).padStart(2, '0')}@college.edu`;
      const phone = `+91 98765 ${String(43200 + i).padStart(5, '0')}`;
      const department = departments[(i - 1) % departments.length];
      const year = '3rd Year';

      // Create user auth doc
      const user = await User.create({
        name,
        email,
        password: 'Student@123',
        role: 'STUDENT',
        phone,
        isActive: true,
      });

      // Create student profile doc
      const student = await Student.create({
        userId: user._id,
        studentId: `STD-${rollNumber}`,
        rollNumber,
        name,
        email,
        phone,
        department,
        year,
        role: 'STUDENT',
        deviceId: null,
        deviceRegistrationStatus: false,
        attendancePercentage: 0,
        totalClasses: 0,
        attendedClasses: 0,
        accountStatus: 'ACTIVE',
      });

      studentUsers.push(user);
      students.push(student);
    }

    console.log('[Seed] Logging initial audit event...');
    await AuditLog.create({
      action: 'SYSTEM_INITIALIZED',
      performedBy: adminUser._id,
      details: {
        totalStudentsCreated: students.length,
        busNumber: bus.busNumber,
      },
      status: 'SUCCESS',
    });

    console.log('====================================================');
    console.log(' SEED COMPLETED SUCCESSFULLY!');
    console.log('====================================================');
    console.log(`Total Students Seeded : ${students.length}`);
    console.log(`Bus Assigned           : ${bus.busNumber} (${bus.routeName})`);
    console.log('----------------------------------------------------');
    console.log(' DEMO CREDENTIALS:');
    console.log('   ADMIN  : admin@college.edu   / Admin@123');
    console.log('   DRIVER : driver@college.edu  / Driver@123');
    console.log('   STUDENT 1: student01@college.edu / Student@123 (Roll: 23CS001)');
    console.log('   STUDENT 2: student02@college.edu / Student@123 (Roll: 23CS002)');
    console.log('   ... up to student68@college.edu / Student@123 (Roll: 23CS068)');
    console.log('====================================================');

    return { adminUser, driverUser, bus, students };
  } catch (error) {
    console.error('[Seed Error]', error);
    throw error;
  }
};

// Execute if run directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      console.log('[Seed] Done. Disconnecting...');
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Fatal]', err);
      process.exit(1);
    });
}
