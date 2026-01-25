import mongoose from 'mongoose'

export async function connectToDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dream_shop'
  mongoose.set('strictQuery', true)
  await mongoose.connect(mongoUri, {
    autoIndex: true
  })
  console.log('Connected to MongoDB')
}


