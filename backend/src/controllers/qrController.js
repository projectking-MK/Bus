import crypto from 'crypto';
import { QRCode } from '../models/QRCode.js';
import { BusTrip } from '../models/BusTrip.js';

export const getCurrentQR = async (req, res) => {
  try {
    const activeTrip = await BusTrip.findOne({ status: 'ACTIVE' });
    if (!activeTrip) {
      return res.status(400).json({
        success: false,
        message: 'Attendance is currently closed. No active bus trip.',
      });
    }

    const expiryWindow = parseInt(process.env.QR_EXPIRY_SECONDS || '25', 10);
    const now = new Date();

    // Check for an existing valid QR token for this trip
    let currentQR = await QRCode.findOne({
      tripId: activeTrip._id,
      isActive: true,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });

    // If no valid active token exists or existing token has expired, generate a new one
    if (!currentQR) {
      const token = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(now.getTime() + expiryWindow * 1000);

      currentQR = await QRCode.create({
        token,
        tripId: activeTrip._id,
        expiresAt,
        isActive: true,
      });
    }

    const remainingMs = new Date(currentQR.expiresAt).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    res.json({
      success: true,
      token: currentQR.token,
      tripId: activeTrip.tripId,
      expiresAt: currentQR.expiresAt,
      remainingSeconds,
      totalValiditySeconds: expiryWindow,
      busLocation: {
        latitude: activeTrip.currentLatitude,
        longitude: activeTrip.currentLongitude,
        geofenceRadius: activeTrip.geofenceRadius,
      },
    });
  } catch (error) {
    console.error('[QR Controller Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate or fetch dynamic QR token',
      error: error.message,
    });
  }
};
