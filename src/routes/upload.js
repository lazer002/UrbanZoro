import express from 'express'
import { upload } from '../middleware/upload.js'
import { supabase } from '../config/supabase.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import dotenv from 'dotenv'
dotenv.config()
const router = express.Router()


router.post('/image',requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
console.log("req.body:", req.body);
  console.log("req.file:", req.file);
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const fileExt = req.file.originalname.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const path = `products/${fileName}`
    const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET || 'public').upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    })
    if (error) return res.status(500).json({ error: error.message })
    const { data: pub } = supabase.storage.from(process.env.SUPABASE_BUCKET || 'public').getPublicUrl(data.path)
    res.json({ url: pub.publicUrl, path: data.path })
  } catch (e) {
    res.status(500).json({ error: 'Upload failed' })
  }
})




export default router


