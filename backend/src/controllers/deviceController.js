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

      // Keep student document synchronized
      if (!student.deviceRegistrationStatus || student.deviceId !== deviceIdentifier) {
        student.deviceId = deviceIdentifier;
        student.deviceRegistrationStatus = true;
        await student.save();
      }

      return res.json({
        success: true,
        message: 'Device verified successfully',
        device: existingDevice,
      });
    }

    // Check if this physical device is already bound to another student!
    const deviceBoundToOther = await Device.findOne({
      deviceIdentifier,
      studentId: { $ne: student._id },
    }).populate('studentId', 'rollNumber name');

    if (deviceBoundToOther) {
      const otherStudent = deviceBoundToOther.studentId;
      if (otherStudent) {
        const otherInfo = `${otherStudent.rollNumber} (${otherStudent.name})`;

        await AuditLog.create({
          action: 'DEVICE_REGISTRATION_REJECTED_ALREADY_BOUND',
          performedBy: req.user._id,
          targetStudentId: student._id,
          details: {
            deviceIdentifier,
            alreadyBoundTo: otherInfo,
          },
          ipAddress: req.ip || '',
          userAgent: userAgent || req.headers['user-agent'] || '',
          status: 'WARNING',
        });

        return res.status(403).json({
          success: false,
          message: `Anti-Proxy Security: This device is already registered to ${otherInfo}. A physical device cannot be shared between students. Each student must use their own phone.`,
        });
      } else {
        // Clean up orphaned device record from a deleted student
        await Device.deleteOne({ _id: deviceBoundToOther._id });
      }
    }

    // Register new device with upsert to prevent duplicate key race conditions
    const newDevice = await Device.findOneAndUpdate(
      { studentId: student._id },
      {
        $set: {
          deviceIdentifier,
          userAgent: userAgent || req.headers['user-agent'] || '',
          ipAddress: req.ip || '',
          lastUsedAt: new Date(),
          status: 'ACTIVE',
        },
        $setOnInsert: {
          registeredAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

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
    if (error.code === 11000) {
      return res.status(403).json({
        success: false,
        message: 'Anti-Proxy Security: This device is already registered to another student. One device cannot be shared between multiple accounts.',
      });
    }

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
    if (student.deviceId) {
      await Device.deleteMany({ deviceIdentifier: student.deviceId });
    }

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

export const unbindAllDevices = async (req, res) => {
  try {
    const deleteResult = await Device.deleteMany({});
    const updateResult = await Student.updateMany(
      {},
      {
        $set: {
          deviceId: null,
          deviceRegistrationStatus: false,
        },
      }
    );

    await AuditLog.create({
      action: 'ALL_DEVICES_UNBOUND_BY_ADMIN',
      performedBy: req.user._id,
      details: {
        deletedDevicesCount: deleteResult.deletedCount,
        updatedStudentsCount: updateResult.modifiedCount,
        adminName: req.user.name,
      },
      ipAddress: req.ip || '',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: `All devices unbound successfully (${deleteResult.deletedCount} devices removed, ${updateResult.modifiedCount} student accounts reset). All students can now bind new devices on next login.`,
      deletedCount: deleteResult.deletedCount,
      modifiedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error('[Unbind All Devices Error]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unbind all devices',
      error: error.message,
    });
  }
};

