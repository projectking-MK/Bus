import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri) {
      console.log(`[Database] Attempting connection to ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}...`);
      // Short timeout on initial connection attempt in local dev so fallback kicks in quickly if offline
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 2500,
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
      return conn;
    }
  } catch (err) {
    console.warn(`[Database] Could not connect to primary MONGODB_URI: ${err.message}`);
  }

  // If in dev or test mode and primary connection fails, start in-memory Mongo server
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('[Database] Starting local MongoDB Memory Server fallback for seamless development...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[Database] Connected to In-Memory MongoDB at ${memUri}`);
      return conn;
    } catch (memErr) {
      console.error('[Database] Failed to start MongoMemoryServer:', memErr.message);
      throw memErr;
    }
  } else {
    throw new Error('Database connection failed in production mode.');
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    console.log('[Database] Disconnected successfully');
  } catch (err) {
    console.error('[Database] Error during disconnect:', err.message);
  }
};
