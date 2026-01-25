import express from 'express'
import { CartItem } from '../models/CartItem.js'
import { Product } from '../models/Product.js'
import { requireAuth } from '../middleware/auth.js'
import mongoose from 'mongoose'
const router = express.Router()

// Helper to get cart key (user or guest)
function cartKey(req) {
  if (req.user?.id) return { user: req.user.id }
  const guestId = req.headers['x-guest-id']
  if (!guestId || typeof guestId !== 'string') return null
  return { guestId }
}

router.get('/', async (req, res) => {
  const key = cartKey(req);

  try {
    const items = await CartItem.find(key)
      .populate('product', 'title price images')
      .populate('bundle', 'title price images')
      .populate('bundleProducts.product', 'title price images');

    res.json({ items }); // ✅ wrap in object for frontend compatibility
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cart items' });
  }
});



// Add to cart with size support
router.post('/add', async (req, res) => {
  console.log("Add to cart request body:", req.body);
  const key = cartKey(req); // { user: userId } or { guestId }
  const { productId, quantity = 1, size } = req.body;

  if (!key || !productId || !size)
    return res.status(400).json({ error: 'Missing fields: productId or size' });

  const product = await Product.findById(productId);
  if (!product || !product.published)
    return res.status(404).json({ error: 'Product not found' });

  // Filter includes product + size + user/guest
  const filter = { ...key, product: productId, size };

  // Increment quantity if already exists, else create new
  const update = { $inc: { quantity: Number(quantity) } };

  const item = await CartItem.findOneAndUpdate(filter, update, {
    new: true, // return updated doc
    upsert: true, // create if doesn't exist
  });

  res.json({ message: 'Added to cart', item });
});

router.post('/addbundle', async (req, res) => {
  console.log("Add bundle to cart request body:", req.body);
  const key = cartKey(req);
  const { bundleId, bundleProducts, quantity = 1, mainImage } = req.body;

  if (!key || !bundleId || !Array.isArray(bundleProducts) || bundleProducts.length === 0)
    return res.status(400).json({ error: 'Missing fields' });

  for (const p of bundleProducts) {
    if (!p.productId || !mongoose.isValidObjectId(p.productId)) {
      return res.status(400).json({ error: `Invalid productId: ${p.productId}` });
    }
  }

  const forCompare = bundleProducts.map(p => ({
    product: String(p.productId),
    size: p.size ?? "",
    quantity: Number(p.quantity ?? 1),
  }));

  const forSave = bundleProducts.map(p => ({
    product: new mongoose.Types.ObjectId(p.productId),
    size: p.size ?? "",
    quantity: Number(p.quantity ?? 1),
  }));

  const canonical = arr =>
    arr
      .map(x => `${x.product}:${x.size}:${x.quantity}`)
      .sort()
      .join("|");

  const newSig = canonical(forCompare);

  try {
    const existingRows = await CartItem.find({
      ...key,
      bundle: mongoose.isValidObjectId(bundleId) ? new mongoose.Types.ObjectId(bundleId) : bundleId,
    }).exec();

    const matchingRow = existingRows.find((row) => {
      const existingCompare = (row.bundleProducts || []).map(bp => ({
        product: bp.product ? bp.product.toString() : String(bp.product),
        size: bp.size ?? "",
        quantity: Number(bp.quantity ?? 1),
      }));
      const existingSig = canonical(existingCompare);
      return existingSig === newSig;
    });

    if (matchingRow) {
      matchingRow.quantity = (matchingRow.quantity || 0) + Number(quantity || 1);
      await matchingRow.save();
      await matchingRow.populate([
        { path: 'bundle', select: 'title price images' },
        { path: 'bundleProducts.product', select: 'title price images' },
      ]);
      return res.json({ message: 'Bundle quantity updated', item: matchingRow });
    }

    const createDoc = {
      ...key,
      bundle: mongoose.isValidObjectId(bundleId) ? new mongoose.Types.ObjectId(bundleId) : bundleId,
      mainImage: mainImage || null,
      bundleProducts: forSave,
      quantity: Number(quantity || 1),
    };
    delete createDoc.product;
    delete createDoc.size;

    let newItem;
    try {
      newItem = await CartItem.create(createDoc);
    } catch (err) {
      if (err && err.code === 11000) {
        const doc = await CartItem.findOne({
          ...key,
          bundle: mongoose.isValidObjectId(bundleId) ? new mongoose.Types.ObjectId(bundleId) : bundleId,
        });
        if (doc) {
          doc.quantity = (doc.quantity || 0) + Number(quantity || 1);
          await doc.save();
          await doc.populate([
            { path: 'bundle', select: 'title price images' },
            { path: 'bundleProducts.product', select: 'title price images' },
          ]);
          return res.json({ message: 'Bundle quantity updated (after race)', item: doc });
        }
      }
      throw err;
    }

    const populatedItem = await CartItem.findById(newItem._id)
      .populate('bundle', 'title price images')
      .populate('bundleProducts.product', 'title price images');

    return res.json({ message: 'Bundle added to cart', item: populatedItem });
  } catch (err) {
    console.error('addbundle error:', err);
    return res.status(500).json({ error: 'Failed to add bundle' });
  }
});




// 🛒 Update item (works for both product & bundle)
router.post('/update', async (req, res) => {
  console.log("Update cart item request body000000:", req.body);
  const key = cartKey(req);
  const { productId, size, bundleId, quantity } = req.body;

  if (!key || quantity == null)
    return res.status(400).json({ error: 'Missing required fields' });

  // 🧹 If quantity <= 0, just delete it
  if (quantity <= 0) {
    const filter = bundleId
      ? { ...key, bundle: bundleId }
      : { ...key, product: productId, size };

    await CartItem.findOneAndDelete(filter);
    return res.json({ ok: true, message: "Item removed from cart" });
  }

  // 🧠 Build the filter
  const filter = bundleId
    ? { ...key, bundle: bundleId }
    : { ...key, product: productId, size };

  // 🔁 Update quantity
  const item = await CartItem.findOneAndUpdate(
    filter,
    { $set: { quantity } },
    { new: true }
  );

  if (!item)
    return res.status(404).json({ error: "Cart item not found" });

  res.json({ message: "Cart updated", item });
});


router.post('/remove', async (req, res) => {
  const key = cartKey(req);
  const { productId, size, bundleId } = req.body;

  if (!key || (!productId && !bundleId))
    return res.status(400).json({ error: 'Missing required fields' });

  const filter = bundleId
    ? { ...key, bundle: bundleId }
    : { ...key, product: productId, size };

  const result = await CartItem.findOneAndDelete(filter);

  if (!result)
    return res.status(404).json({ error: 'Cart item not found' });

  res.json({ message: 'Item removed from cart', item: result });
});

router.post('/clear', async (req, res) => {
  try {
    const key = cartKey(req); // returns { user: userId } or { guestId }
    if (!key) {
      return res.status(400).json({ error: 'Missing user or guest identifier' });
    }
    const result = await CartItem.deleteMany(key);

    res.json({
      success: true,
      message: 'Cart cleared successfully',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});
// Merge guest cart after login
router.post('/merge', requireAuth, async (req, res) => {
  const { guestId } = req.body
  if (!guestId) return res.status(400).json({ error: 'Missing guestId' })

  const guestItems = await CartItem.find({ guestId })
  for (const gi of guestItems) {
    await CartItem.findOneAndUpdate(
      { user: req.user.id, product: gi.product, size: gi.size },
      { $inc: { quantity: gi.quantity } },
      { upsert: true, new: true }
    )
  }
  await CartItem.deleteMany({ guestId })

  const items = await CartItem.find({ user: req.user.id }).populate('product')
  res.json({ items })
})

export default router
