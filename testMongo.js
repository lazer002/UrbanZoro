import mongoose from "mongoose";

const uri =
  "mongodb://lazer:BDL30AGo0Xu1Lvt9@cluster0-shard-00-00.xgyiu.mongodb.net:27017,cluster0-shard-00-01.xgyiu.mongodb.net:27017,cluster0-shard-00-02.xgyiu.mongodb.net:27017/dream?ssl=true&replicaSet=atlas-11c2dc-shard-0&authSource=admin&retryWrites=true&w=majority";

(async () => {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ MongoDB connected");
    process.exit(0);
  } catch (err) {
    console.error("❌ MongoDB failed:", err.message);
    process.exit(1);
  }
})();