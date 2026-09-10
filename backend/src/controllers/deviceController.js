import { Device } from '../models/Device.js';
import { Student } from '../models/Student.js';
import { AuditLog } from '../models/AuditLog.js';

export const registerDevice = async (req, res) => {
  try {
    const student = req.student;
    const { deviceIdentifier, userAgent } = req.body;

    if (!deviceIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Device identifier is required',
      });
    }

    let existingDevice = await Device.findOne({ studentId: student._id });

    if (existingDevice) {
      if (existingDevice.deviceIdentifier !== deviceIdentifier) {
        // Device mismatch
        await AuditLog.create({
          action: 'DEVICE_MISMATCH_BLOCKED',
          performedBy: req.user._id,
          targetStudentId: student._id,
          details: {
            attemptedDevice: deviceIdentifier,
            registeredDevice: existingDevice.deviceIdentifier,
          },
          ipAddress: req.ip || '',
          userAgent: userAgent || req.headers['user-agent'] || '',
          status: 'WARNING',
        });

        return res.status(403).json({
          success: false,
          message: 'This account is registered to another device.',
        });
      }

      // Existing device matches - refresh last used
      existingDevice.lastUsedAt = new Date();
      if (userAgent) existingDevice.userAgent = userAgent;
      existingDevice.ipAddress = req.ip || '';
      await existingDevice.save();

      return res.json({
        success: true,
        message: 'Device verified successfully',
        device: existingDevice,
      });
    }

    // Register new device
    const newDevice = await Device.create({
      studentId: student._id,
      deviceIdentifier,
      userAgent: userAgent || req.headers['user-agent'] || '',
      ipAddress: req.ip || '',
      registeredAt: new Date(),
      lastUsedAt: new Date(),
      status: 'ACTIVE',
    });

    student.deviceId = deviceIdentifier;
    student.deviceRegistrationStatus = true;
    await student.save();

    await AuditLog.create({
      action: 'DEVICE_REGISTERED',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: { deviceIdentifier },
      ipAddress: req.ip || '',
      userAgent: userAgent || '',
      status: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: 'Device registered successfully.',
      device: newDevice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to register device',
      error: error.message,
    });
  }
};

export const resetDevice = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    await Device.deleteMany({ studentId: student._id });

    student.deviceId = null;
    student.deviceRegistrationStatus = false;
    await student.save();

    await AuditLog.create({
      action: 'DEVICE_RESET_BY_ADMIN',
      performedBy: req.user._id,
      targetStudentId: student._id,
      details: { rollNumber: student.rollNumber, studentName: student.name },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `Device binding for ${student.name} (${student.rollNumber}) has been reset.`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reset device',
      error: error.message,
    });
  }
};

export const getMyDevice = async (req, res) => {
  try {
    const device = await Device.findOne({ studentId: req.student._id });
    res.json({
      success: true,
      registered: !!device,
      device: device || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve device status',
      error: error.message,
    });
  }
};
