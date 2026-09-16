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

// 55 Registered Students Dataset: Exactly 21 Boys and 34 Girls
const initialStudentsDataset = [
  // 1-10 (5 Boys, 5 Girls)
  { name: 'Aarav Sharma', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Aditi Rao', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Akash Patel', gender: 'Male', year: '2nd Year', department: 'Electronics & Communication' },
  { name: 'Ananya Iyer', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Arjun Menon', gender: 'Male', year: '4th Year', department: 'Mechanical Engineering' },
  { name: 'Bhavna Joshi', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Chetan Verma', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Deepa Nair', gender: 'Female', year: '2nd Year', department: 'Electronics & Communication' },
  { name: 'Devendra Reddy', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Divya Sundaram', gender: 'Female', year: '4th Year', department: 'Information Technology' },

  // 11-20 (6 Boys, 4 Girls)
  { name: 'Gautam Pillai', gender: 'Male', year: '3rd Year', department: 'Mechanical Engineering' },
  { name: 'Gayatri Kapoor', gender: 'Female', year: '2nd Year', department: 'Computer Science & Engineering' },
  { name: 'Harish Chandra', gender: 'Male', year: '3rd Year', department: 'Electronics & Communication' },
  { name: 'Hemalatha K', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Ishan Deshmukh', gender: 'Male', year: '2nd Year', department: 'Computer Science & Engineering' },
  { name: 'Janani S', gender: 'Female', year: '3rd Year', department: 'Electronics & Communication' },
  { name: 'Jitendra Das', gender: 'Male', year: '4th Year', department: 'Mechanical Engineering' },
  { name: 'Kalyan Raman', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Kavitha N', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Kishore Kumar', gender: 'Male', year: '2nd Year', department: 'Electronics & Communication' },

  // 21-30 (6 Boys, 4 Girls)
  { name: 'Lakshmi Narayanan', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Madhavan R', gender: 'Male', year: '3rd Year', department: 'Information Technology' },
  { name: 'Meera Bhatt', gender: 'Female', year: '2nd Year', department: 'Electronics & Communication' },
  { name: 'Manoj Tiwari', gender: 'Male', year: '4th Year', department: 'Mechanical Engineering' },
  { name: 'Namrata Sen', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Naveen Raj', gender: 'Male', year: '3rd Year', department: 'Information Technology' },
  { name: 'Niharika Roy', gender: 'Female', year: '2nd Year', department: 'Electronics & Communication' },
  { name: 'Nirmal Prabhu', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Pradeep Hegde', gender: 'Male', year: '4th Year', department: 'Mechanical Engineering' },
  { name: 'Pranav Anand', gender: 'Male', year: '2nd Year', department: 'Computer Science & Engineering' },

  // 31-40 (4 Boys, 6 Girls) -> Cumulative Boys: 21
  { name: 'Pavithra M', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Preethi V', gender: 'Female', year: '3rd Year', department: 'Electronics & Communication' },
  { name: 'Rahul Mehra', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Rajeshwari B', gender: 'Female', year: '2nd Year', department: 'Information Technology' },
  { name: 'Rakesh Nair', gender: 'Male', year: '4th Year', department: 'Mechanical Engineering' },
  { name: 'Ramesh Krishnan', gender: 'Male', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Renu Mathur', gender: 'Female', year: '3rd Year', department: 'Electronics & Communication' },
  { name: 'Rishabh Sinha', gender: 'Male', year: '2nd Year', department: 'Information Technology' },
  { name: 'Riya Mukherjee', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Roshni Gupta', gender: 'Female', year: '3rd Year', department: 'Mechanical Engineering' },

  // 41-50 (0 Boys, 10 Girls)
  { name: 'Rohini Paul', gender: 'Female', year: '4th Year', department: 'Information Technology' },
  { name: 'Sadhana Rao', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Sai Pallavi', gender: 'Female', year: '2nd Year', department: 'Electronics & Communication' },
  { name: 'Sangeetha Swaminathan', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Sandhya V', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Santhoshi Priya', gender: 'Female', year: '4th Year', department: 'Mechanical Engineering' },
  { name: 'Sapna Sharma', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Saranya G', gender: 'Female', year: '2nd Year', department: 'Electronics & Communication' },
  { name: 'Shalini Mohan', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Shilpa Shetty', gender: 'Female', year: '4th Year', department: 'Computer Science & Engineering' },

  // 51-55 (0 Boys, 5 Girls) -> Exactly 55 Students (21 Boys, 34 Girls)
  { name: 'Shobana Chandran', gender: 'Female', year: '3rd Year', department: 'Electronics & Communication' },
  { name: 'Shraddha Kapoor', gender: 'Female', year: '2nd Year', department: 'Mechanical Engineering' },
  { name: 'Shruti Haasan', gender: 'Female', year: '3rd Year', department: 'Information Technology' },
  { name: 'Sowmya Ramaswamy', gender: 'Female', year: '3rd Year', department: 'Computer Science & Engineering' },
  { name: 'Sneha Reddy', gender: 'Female', year: '4th Year', department: 'Computer Science & Engineering' },
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

    console.log('[Seed] Creating Bus Vehicle (Capacity: 55)...');
    const bus = await Bus.create({
      busNumber: 'BUS-01',
      routeName: 'Main Campus Express Route 4 (Tambaram - Campus)',
      capacity: 55,
      defaultGeofenceRadius: 100, // 100 meters
      defaultCenterLatitude: 13.0827,
      defaultCenterLongitude: 80.2707,
      isActive: true,
    });

    console.log(`[Seed] Generating 55 Registered Students (21 Boys, 34 Girls)...`);
    const studentUsers = [];
    const students = [];

    for (let i = 1; i <= 55; i++) {
      const padNum = String(i).padStart(3, '0');
      const rollNumber = `23CS${padNum}`;
      const template = initialStudentsDataset[i - 1];
      const name = template.name;
      const gender = template.gender;
      const year = template.year;
      const department = template.department;
      const email = `student${String(i).padStart(2, '0')}@college.edu`;
      const phone = `+91 98765 ${String(43200 + i).padStart(5, '0')}`;

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
        gender,
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
        boysCount: students.filter((s) => s.gender === 'Male').length,
        girlsCount: students.filter((s) => s.gender === 'Female').length,
        busNumber: bus.busNumber,
        capacity: 55,
      },
      status: 'SUCCESS',
    });

    const boysCount = students.filter((s) => s.gender === 'Male').length;
    const girlsCount = students.filter((s) => s.gender === 'Female').length;

    console.log('====================================================');
    console.log(' SEED COMPLETED SUCCESSFULLY FOR 55 STUDENTS!');
    console.log('====================================================');
    console.log(`Total Students Seeded : ${students.length}`);
    console.log(`  - Number of Boys     : ${boysCount}`);
    console.log(`  - Number of Girls    : ${girlsCount}`);
    console.log(`Bus Assigned           : ${bus.busNumber} (Capacity: ${bus.capacity})`);
    console.log('----------------------------------------------------');
    console.log(' DEMO CREDENTIALS:');
    console.log('   ADMIN  : admin@college.edu   / Admin@123');
    console.log('   DRIVER : driver@college.edu  / Driver@123');
    console.log('   STUDENT 1: student01@college.edu / Student@123 (Roll: 23CS001 - Boy)');
    console.log('   STUDENT 2: student02@college.edu / Student@123 (Roll: 23CS002 - Girl)');
    console.log('   ... up to student55@college.edu / Student@123 (Roll: 23CS055 - Girl)');
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
