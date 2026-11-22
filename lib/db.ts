import mongoose from "mongoose";
declare global { var mongooseConnection: Promise<typeof mongoose> | undefined }
export default function db() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Set MONGODB_URI in .env.local");
  if (!global.mongooseConnection) global.mongooseConnection = mongoose.connect(uri, { dbName: "event-management" });
  return global.mongooseConnection;
}
