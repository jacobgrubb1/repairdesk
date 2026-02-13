const express = require('express');
const partModel = require('../models/part');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { search, category, lowStock, supplierId } = req.query;
    res.json(await partModel.findByStore(req.user.storeId, { search, category, lowStock: lowStock === 'true', supplierId }));
  } catch (err) { next(err); }
});

router.get('/categories', async (req, res, next) => {
  try {
    res.json(await partModel.getCategories(req.user.storeId));
  } catch (err) { next(err); }
});

router.get('/low-stock', async (req, res, next) => {
  try {
    res.json(await partModel.getLowStockParts(req.user.storeId));
  } catch (err) { next(err); }
});

router.get('/search', async (req, res, next) => {
  try {
    res.json(await partModel.searchForCost(req.user.storeId, req.query.q || ''));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const part = await partModel.findById(req.params.id, req.user.storeId);
    if (!part) return res.status(404).json({ error: 'Part not found' });
    const transactions = await partModel.getTransactions(req.params.id);
    res.json({ ...part, transactions });
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'Name is required' });
    const part = await partModel.create({ storeId: req.user.storeId, ...req.body });
    res.status(201).json(part);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const part = await partModel.update(req.params.id, req.user.storeId, req.body);
    if (!part) return res.status(404).json({ error: 'Part not found' });
    res.json(part);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await partModel.delete(req.params.id, req.user.storeId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/restock', authorize('admin'), async (req, res, next) => {
  try {
    const { quantity, note } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });
    const part = await partModel.adjustStock(req.params.id, {
      quantityChange: parseInt(quantity),
      type: 'restock',
      note,
      createdBy: req.user.id,
    });
    res.json(part);
  } catch (err) { next(err); }
});

router.post('/:id/adjust', authorize('admin'), async (req, res, next) => {
  try {
    const { quantityChange, note } = req.body;
    if (quantityChange === undefined) return res.status(400).json({ error: 'quantityChange is required' });
    const part = await partModel.adjustStock(req.params.id, {
      quantityChange: parseInt(quantityChange),
      type: 'adjustment',
      note,
      createdBy: req.user.id,
    });
    res.json(part);
  } catch (err) { next(err); }
});

module.exports = router;
