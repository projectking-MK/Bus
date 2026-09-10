import mongoose from 'mongoose';

const busTripSchema = new mongoose.Schema(
  {
    tripId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['NOT_STARTED', 'ACTIVE', 'COMPLETED'],
      default: 'NOT_STARTED',
      index: true,
    },
    startLatitude: {
      type: Number,
      default: null,
    },
    startLongitude: {
      type: Number,
      default: null,
    },
    currentLatitude: {
      type: Number,
      default: null,
    },
    currentLongitude: {
      type: Number,
      default: null,
    },
    geofenceRadius: {
      type: Number,
      default: 100, // meters
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

export const BusTrip = mongoose.model('BusTrip', busTripSchema);
