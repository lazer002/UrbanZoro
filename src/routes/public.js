import express from 'express'
import {Category}  from '../models/Category.js'
import { upload } from '../middleware/upload.js'
import { supabase } from '../config/supabase.js'
import dotenv from 'dotenv'
dotenv.config()
const router = express.Router()

router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find({})
        res.json({ categories })
    } catch (error) {
        console.error('Error fetching categories:', error)
        res.status(500).json({ error: 'Internal server error' })
    }
})

router.post('/upload/image',upload.single('file'), async (req, res) => {
console.log("req.body:", req.body);
  console.log("req.file:", req.file);
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' })
    const fileExt = req.file.originalname.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const path = `products/${fileName}`
    const { data, error } = await supabase.storage.from(process.env.SUPABASE_BUCKET_PUBLIC).upload(path, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    })
    if (error) return res.status(500).json({ error: error.message })
    const { data: pub } = supabase.storage.from(process.env.SUPABASE_BUCKET_PUBLIC).getPublicUrl(data.path)
    res.json({ url: pub.publicUrl, path: data.path })
  } catch (e) {
    res.status(500).json({ error: 'Upload failed' })
  }
})





export default router