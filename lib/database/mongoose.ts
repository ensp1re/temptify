import mongoose, { Mongoose } from "mongoose";

const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Define a global interface to avoid using 'any'
interface GlobalMongoose {
  mongoose: MongooseConnection;
}

// Ensure the global object has the correct type
declare const global: GlobalMongoose;

let cached: MongooseConnection = global.mongoose || {
  conn: null,
  promise: null,
};

if (!cached) {
  cached = global.mongoose = {
    conn: null,
    promise: null,
  };
}

export const connectToDatabase = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URL) {
    throw new Error(
      "Please define the MONGODB_URL environment variable inside .env.local"
    );
  }

  cached.promise =
    cached.promise ||
    mongoose.connect(MONGODB_URL, {
      dbName: "temptify",
      bufferCommands: false,
    });

  cached.conn = await cached.promise;

  return cached.conn;
};
