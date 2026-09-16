import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusTrip',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    gpsAccuracy: {
      type: Number,
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
    },
    qrTokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QRCode',
    },
    status: {
      type: String,
      enum: ['PRESENT', 'LATE', 'REJECTED'],
      default: 'PRESENT',
      index: true,
    },
    distanceMeters: {
      type: Number,
      default: 0,
    },
    validationResult: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index: One attendance per student per trip
attendanceSchema.index({ studentId: 1, tripId: 1 }, { unique: true });

// Unique compound index: One attendance per physical device per trip (strictly prevents 1 device marking for another person)
attendanceSchema.index({ tripId: 1, deviceId: 1 }, { unique: true });

export const Attendance = mongoose.model('Attendance', attendanceSchema);
