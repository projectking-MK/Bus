import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: true,
      default: 'Male',
    },
    department: {
      type: String,
      required: true,
      enum: ['Computer Science & Engineering', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering'],
      default: 'Computer Science & Engineering',
    },
    year: {
      type: String,
      required: true,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
      default: '3rd Year',
    },
    role: {
      type: String,
      default: 'STUDENT',
    },
    deviceId: {
      type: String,
      default: null,
    },
    deviceRegistrationStatus: {
      type: Boolean,
      default: false,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalClasses: {
      type: Number,
      default: 0,
    },
    attendedClasses: {
      type: Number,
      default: 0,
    },
    accountStatus: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
  },
  {
    timestamps: true,
  }
);

export const Student = mongoose.model('Student', studentSchema);
