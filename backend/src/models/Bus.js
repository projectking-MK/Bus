import mongoose from 'mongoose';

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    routeName: {
      type: String,
      required: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      default: 68,
    },
    defaultGeofenceRadius: {
      type: Number,
      default: 100, // meters
    },
    defaultCenterLatitude: {
      type: Number,
      default: 13.0827, // Default demo coordinates (College Campus)
    },
    defaultCenterLongitude: {
      type: Number,
      default: 80.2707,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Bus = mongoose.model('Bus', busSchema);
