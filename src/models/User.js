import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    // Basic info
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true },
    passwordHash: { type: String }, // optional for social login
    role: { type: String, enum: ['user', 'admin'], default: 'user', index: true },
   googleId: { type: String, unique: true, sparse: true, index: true },
   provider: { 
  type: String, 
  enum: ['local', 'google'], 
  default: 'local' 
},
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },

    // E-commerce related
    wishlist: { type: [mongoose.Schema.Types.ObjectId], ref: 'Product', default: [] },
    cart: { type: [mongoose.Schema.Types.Mixed], default: [] }, // { productId, variant, quantity }
    addresses: { type: [mongoose.Schema.Types.Mixed], default: [] },
    defaultAddress: { type: mongoose.Schema.Types.Mixed },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
loginSource: {
  type: String,
  enum: ["web", "android", "ios"],
},
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
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash)
}

// 🔐 Hash password utility
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export const User = mongoose.model('User', userSchema)
