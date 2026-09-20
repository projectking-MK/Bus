import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      trim: true,
      sparse: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    rawPassword: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['ADMIN', 'DRIVER', 'STUDENT'],
      required: true,
      default: 'STUDENT',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
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

// Encrypt password before saving if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!enteredPassword) return false;
  const match = await bcrypt.compare(enteredPassword, this.password);
  if (match) return true;

  // Tolerant comparison: check without spaces (e.g. "thamaraiselvi ECE" vs "thamaraiselviECE")
  if (enteredPassword.includes(' ')) {
    const spaceLess = enteredPassword.replace(/\s+/g, '');
    const altMatch = await bcrypt.compare(spaceLess, this.password);
    if (altMatch) return true;
  }

  // Tolerant comparison: check without hyphens (e.g. "kalpakaBIO-TECH" vs "kalpakaBIOTECH")
  if (enteredPassword.includes('-')) {
    const hyphenLess = enteredPassword.replace(/-/g, '');
    const altMatch = await bcrypt.compare(hyphenLess, this.password);
    if (altMatch) return true;
  }

  return false;
};

export const User = mongoose.model('User', userSchema);
