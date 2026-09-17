import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

dotenv.config();

export const updateDriver = async () => {
  try {
    console.log('[Update Driver] Connecting to MongoDB...');
    await connectDB();

    const result = await User.updateMany(
      { role: 'DRIVER' },
      { $set: { name: 'Anand' } }
    );

    console.log(`[Update Driver] Updated ${result.modifiedCount} driver records to name "Anand".`);

    const drivers = await User.find({ role: 'DRIVER' });
    console.log('[Update Driver] Current Drivers in DB:', drivers.map(d => ({ email: d.email, name: d.name, username: d.username })));

    await disconnectDB();
    console.log('[Update Driver] Done.');
  } catch (error) {
    console.error('[Update Driver Error]', error);
    process.exit(1);
  }
};

updateDriver();
