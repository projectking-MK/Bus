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

// Helper to derive student username: name without initial
export const deriveStudentUsername = (name) => {
  let cleanName = (name || '').trim();
  // If starts with single letter initial like "S Hari" -> "Hari"
  if (/^[A-Za-z]\.?\s+/.test(cleanName)) {
    cleanName = cleanName.replace(/^[A-Za-z]\.?\s+/, '');
  }
  // Remove trailing initials: e.g. " D", " V P", " B.S", " VM", " R K", " K N", " S N"
  cleanName = cleanName.replace(/\s+([A-Za-z]\.?)+$/g, '');
  cleanName = cleanName.replace(/(\s+[A-Za-z]\.?)+$/g, '');
  return cleanName.trim();
};

// Helper to derive student password: name (in lowercase without initial) + Department (in uppercase)
export const deriveStudentPassword = (name, department) => {
  let cleanName = (name || '').trim();
  // If starts with single letter initial like "S Hari" -> "Hari"
  if (/^[A-Za-z]\.?\s+/.test(cleanName)) {
    cleanName = cleanName.replace(/^[A-Za-z]\.?\s+/, '');
  }
  // Remove trailing initials: e.g. " D", " V P", " B.S", " VM", " R K", " K N", " S N"
  cleanName = cleanName.replace(/\s+([A-Za-z]\.?)+$/g, '');
  cleanName = cleanName.replace(/(\s+[A-Za-z]\.?)+$/g, '');
  cleanName = cleanName.replace(/[\s\.]+/g, '').toLowerCase();
  const cleanDept = (department || '').trim().toUpperCase();
  return cleanDept ? `${cleanName}${cleanDept}` : cleanName;
};

// 55 Registered Students Dataset: Exactly 21 Boys and 34 Girls
export const initialStudentsDataset = [
  { id: 1, name: 'Magila D', department: 'AIDS', year: '1st Year', gender: 'Female' },
  { id: 2, name: 'Sowmitha S', department: 'ECE', year: '3rd Year', gender: 'Female' },
  { id: 3, name: 'Ramya V', department: 'CSE', year: '3rd Year', gender: 'Female' },
  { id: 4, name: 'Kavya V P', department: 'BME', year: '3rd Year', gender: 'Female' },
  { id: 5, name: 'Parthiban G', department: 'CCE', year: '3rd Year', gender: 'Male' },
  { id: 6, name: 'Kishalini P', department: 'AIDS', year: '2nd Year', gender: 'Female' },
  { id: 7, name: 'Mouleeshwari B', department: 'ECE', year: '2nd Year', gender: 'Female' },
  { id: 8, name: 'Makitha R', department: 'AIDS', year: '3rd Year', gender: 'Female' },
  { id: 9, name: 'Kalbhavalli M', department: 'AIDS', year: '2nd Year', gender: 'Female' },
  { id: 10, name: 'Thamarai Selvi D', department: 'ECE', year: '2nd Year', gender: 'Female' },
  { id: 11, name: 'Vishalini B', department: 'IT', year: '3rd Year', gender: 'Female' },
  { id: 12, name: 'Visalaachi', department: 'CSE', year: '1st Year', gender: 'Female' },
  { id: 13, name: 'Mahesha B', department: 'CSE', year: '1st Year', gender: 'Female' },
  { id: 14, name: 'Dharanidharan K', department: 'ECE', year: '1st Year', gender: 'Male' },
  { id: 15, name: 'Mukesh R', department: 'ECE', year: '1st Year', gender: 'Male' },
  { id: 16, name: 'Dharshini B.S', department: 'AIDS', year: '1st Year', gender: 'Female' },
  { id: 17, name: 'Karthick R', department: 'CCE', year: '1st Year', gender: 'Male' },
  { id: 18, name: 'Srigiridharan L', department: 'EEE', year: '1st Year', gender: 'Male' },
  { id: 19, name: 'Dhanya J V', department: 'EEE', year: '4th Year', gender: 'Female' },
  { id: 20, name: 'Dharnesh', department: 'CSBS', year: '4th Year', gender: 'Male' },
  { id: 21, name: 'Roshni M', department: 'ECE', year: '1st Year', gender: 'Female' },
  { id: 22, name: 'Harshikaa S', department: 'CSE', year: '3rd Year', gender: 'Female' },
  { id: 23, name: 'Srinithe T', department: 'ECE', year: '2nd Year', gender: 'Female' },
  { id: 24, name: 'Naviha K', department: 'CSE', year: '3rd Year', gender: 'Female' },
  { id: 25, name: 'Monisha K', department: 'CSE', year: '1st Year', gender: 'Female' },
  { id: 26, name: 'Navaneesh D', department: 'CSE', year: '1st Year', gender: 'Male' },
  { id: 27, name: 'Gubendhiran M', department: 'AIDS', year: '3rd Year', gender: 'Male' },
  { id: 28, name: 'Siddhaarth R K', department: 'CSBS', year: '3rd Year', gender: 'Male' },
  { id: 29, name: 'Loahith V', department: 'CSE', year: '3rd Year', gender: 'Male' },
  { id: 30, name: 'Gokulram K', department: 'EEE', year: '2nd Year', gender: 'Male' },
  { id: 31, name: 'Swetha R', department: 'CSBS', year: '3rd Year', gender: 'Female' },
  { id: 32, name: 'Kowshiek R', department: 'IT', year: '3rd Year', gender: 'Male' },
  { id: 33, name: 'S Hari', department: 'ECE', year: '2nd Year', gender: 'Male' },
  { id: 34, name: 'Bhavatarani G', department: 'AIDS', year: '1st Year', gender: 'Female' },
  { id: 35, name: 'Vaishnavi U', department: 'ECE', year: '2nd Year', gender: 'Female' },
  { id: 36, name: 'Thanseera S', department: 'AIML', year: '4th Year', gender: 'Female' },
  { id: 37, name: 'Keerthika B', department: 'AIML', year: '4th Year', gender: 'Female' },
  { id: 38, name: 'Deepshika P', department: 'AIDS', year: '2nd Year', gender: 'Female' },
  { id: 39, name: 'Pravinaa S N', department: 'CSBS', year: '3rd Year', gender: 'Female' },
  { id: 40, name: 'Aarani S', department: 'IT', year: '1st Year', gender: 'Female' },
  { id: 41, name: 'Varshinika K N', department: 'CSE', year: '3rd Year', gender: 'Female' },
  { id: 42, name: 'Kanishaka E', department: 'ECE', year: '1st Year', gender: 'Female' },
  { id: 43, name: 'Sadhana S', department: 'CIVIL', year: '2nd Year', gender: 'Female' },
  { id: 44, name: 'Kisanth S', department: 'CSE', year: '1st Year', gender: 'Male' },
  { id: 45, name: 'Vyasraj A', department: 'CSE', year: '1st Year', gender: 'Male' },
  { id: 46, name: 'Dharun R', department: 'MECH', year: '4th Year', gender: 'Male' },
  { id: 47, name: 'Dharshan K', department: 'AIML', year: '3rd Year', gender: 'Male' },
  { id: 48, name: 'Dharaneesh C', department: 'MECH', year: '2nd Year', gender: 'Male' },
  { id: 49, name: 'Monisha V', department: 'ECE', year: '2nd Year', gender: 'Female' },
  { id: 50, name: 'Balah VM', department: 'ECE', year: '4th Year', gender: 'Female' },
  { id: 51, name: 'Hemamalini S', department: 'ECE', year: '4th Year', gender: 'Female' },
  { id: 52, name: 'Kalpaka E', department: 'BIO-TECH', year: '4th Year', gender: 'Female' },
  { id: 53, name: 'Rohit M', department: 'BME', year: '2nd Year', gender: 'Male' },
  { id: 54, name: 'Saravanan S', department: 'CIVIL', year: '2nd Year', gender: 'Male' },
  { id: 55, name: 'Niranjan S', department: 'CSE', year: '3rd Year', gender: 'Male' }
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
      name: 'R. Kowshiek IT',
      username: 'admin',
      email: 'admin@college.edu',
      password: 'Admin@123',
      role: 'ADMIN',
      phone: '+91 94440 12345',
      isActive: true,
    });

    console.log('[Seed] Creating Bus Driver User...');
    const driverUser = await User.create({
      name: 'Anand',
      username: 'driver',
      email: 'driver@college.edu',
      password: 'Driver@123',
      role: 'DRIVER',
      phone: '+91 98410 98765',
      isActive: true,
    });

    console.log('[Seed] Creating Bus Vehicle (Capacity: 55)...');
    const bus = await Bus.create({
      busNumber: 'BUS-09',
      routeName: 'College Bus No 09',
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
      const username = deriveStudentUsername(name);
      const password = deriveStudentPassword(name, department);
      const email = `student${String(i).padStart(2, '0')}@college.edu`;
      const phone = `+91 98765 ${String(43200 + i).padStart(5, '0')}`;

      // Create user auth doc
      const user = await User.create({
        name,
        username,
        email,
        password,
        rawPassword: password,
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
