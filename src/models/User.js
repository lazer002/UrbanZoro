import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    // Basic info
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String }, // optional for social login
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
    googleId: { type: String, unique: true, sparse: true },
    provider: { type: String, default: 'local' },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },

    // E-commerce related
    wishlist: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    cart: { type: [mongoose.Schema.Types.Mixed], default: [] },
    addresses: { type: [mongoose.Schema.Types.Mixed], default: [] },
    defaultAddress: { type: mongoose.Schema.Types.Mixed },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

    // Account info
    isVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    preferences: {
      newsletter: { type: Boolean, default: true },
      notifications: { type: Boolean, default: true },
    },
    status: { type: String, enum: ['active', 'suspended', 'deleted'], default: 'active' }
  },
  { timestamps: true }
)

// 🔑 Verify password for local login
userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash)
}

// 🔐 Hash password utility
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export const User = mongoose.model('User', userSchema)
