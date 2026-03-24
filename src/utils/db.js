import mongoose from 'mongoose'

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-chat-app'
  mongoose.set('strictQuery', true)
  await mongoose.connect(mongoUri, {
    autoIndex: true
  })
  console.log('Connected to MongoDB')
}


