import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusTrip',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
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

// TTL index to automatically clean up old tokens after 24 hours
qrCodeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const QRCode = mongoose.model('QRCode', qrCodeSchema);
