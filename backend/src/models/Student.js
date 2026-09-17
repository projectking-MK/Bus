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
      trim: true,
      default: 'CSE',
    },
    year: {
      type: String,
      required: true,
      trim: true,
      default: '1st Year',
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
    lastLatitude: {
      type: Number,
      default: null,
    },
    lastLongitude: {
      type: Number,
      default: null,
    },
    lastGpsAccuracy: {
      type: Number,
      default: null,
    },
    lastLocationUpdate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Student = mongoose.model('Student', studentSchema);
