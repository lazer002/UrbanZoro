import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import morgan from 'morgan'
import cookieParser from 'cookie-parser'  // <-- ADD THIS
import os from 'os'
import { connectToDatabase } from './utils/db.js'
import authRouter from './routes/auth.js'
import productsRouter from './routes/products.js'
import cartRouter from './routes/cart.js'
import ordersRouter from './routes/orders.js'
import adminUsersRouter from './routes/adminUsers.js'
import uploadRouter from './routes/upload.js'
import statsRouter from './routes/stats.js'
import searchRouter from './routes/search.js'
import publicRouter from './routes/public.js'
import bundleRoutes from "./routes/bundles.js";
import adminOrdersRouter from './routes/adminOrder.js'
import wishlistRouter from './routes/wishlist.js'
import returnsRouter from './routes/return.js'
import notificationRoutes from './routes/notification.js'
import user from './routes/user.js'
import address from './routes/address.js'

dotenv.config()

const app = express()

/* -------------------------------------------------------------------------- */
/*                         ALLOWED ORIGINS (as before)                        */
/* -------------------------------------------------------------------------- */

const allowedOrigins = [
  process.env.CLIENT_ORIGIN_WEB,
  process.env.CLIENT_ORIGIN_APP,
  process.env.LOCAL_NETWORK
]

/* -------------------------------------------------------------------------- */
/*                                CORS CONFIG                                 */
/* -------------------------------------------------------------------------- */

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,  // <-- MUST be true for cookies
}))

/* -------------------------------------------------------------------------- */
/*                             PARSERS & LOGGING                               */
/* -------------------------------------------------------------------------- */
app.use("/api/orders/webhook", express.raw({ type: "application/json" }));
app.use(express.json())
app.use(cookieParser())    // <-- ADD THIS
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

/* -------------------------------------------------------------------------- */
/*                                 ROUTES                                      */
/* -------------------------------------------------------------------------- */

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'dream-shop-backend',
    env: process.env.NODE_ENV || 'development'
  })
})

app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use("/api/search", searchRouter)
app.use('/api/cart', cartRouter)
app.use('/api/orders', ordersRouter)
app.use('/api/admin', adminUsersRouter)
app.use('/api/admin/upload', uploadRouter)
app.use('/api/admin/stats', statsRouter)
app.use("/api/bundles", bundleRoutes)
app.use('/api/admin/orders', adminOrdersRouter)
app.use('/api', publicRouter)
app.use('/api/wishlist', wishlistRouter)
app.use('/api/returns', returnsRouter)
app.use("/api/notifications", notificationRoutes);
app.use('/api/user', user)
app.use('/api/address', address) // <-- ADD THIS

/* -------------------------------------------------------------------------- */
/*                           SERVER START + LOCAL IP                           */
/* -------------------------------------------------------------------------- */

const port = process.env.PORT || 4000

function getLocalExternalIP() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return 'localhost'
}

connectToDatabase().then(() => {
  app.listen(port, () => {
    const localIP = getLocalExternalIP()
    console.log(`API running on: http://${localIP}:${port}`)
    console.log(`Also accessible on localhost:${port}`)
  })
}).catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
