import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { Category } from '../models/Category.js'


const router = express.Router()

router.use(requireAuth, requireAdmin)

// List users
router.get('/', async (_req, res) => {
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 })
  res.json({ items: users })
})

// Update role
router.patch('/:id', async (req, res) => {
  const { role, name } = req.body
  const update = {}
  if (role) update.role = role
  if (name) update.name = name
  const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, projection: { passwordHash: 0 } })
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json(user)
})

// Delete user
router.delete('/:id', async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})
router.post("/createCategory", async (req, res) => {
  try {
    const { name, slug, photo } = req.body; // accept photo URL
    const category = new Category({
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      photo: photo || null,
    });
    await category.save();
    res.json({ success: true, category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all categories
router.get("/getCategory", async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update category
router.put("/category/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, photo } = req.body; // accept photo URL
    const updated = await Category.findByIdAndUpdate(
      id,
      { 
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        ...(photo && { photo }) // only update if provided
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true, category: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete category
router.delete("/category/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Category.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: "Category not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


export default router


