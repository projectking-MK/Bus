import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true, // One registered device per student
    },
    deviceIdentifier: {
      type: String,
      required: true,
      unique: true, // Strictly 1 student per physical device - prevents proxy sharing
      index: true,
      trim: true,
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'BLOCKED'],
      default: 'ACTIVE',
    },
    userAgent: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Device = mongoose.model('Device', deviceSchema);
