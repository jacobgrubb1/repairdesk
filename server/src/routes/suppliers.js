const express = require('express');
const supplierModel = require('../models/supplier');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(await supplierModel.findByStore(req.user.storeId, { search: req.query.search }));
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const supplier = await supplierModel.findById(req.params.id, req.user.storeId);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (err) { next(err); }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'Name is required' });
    const supplier = await supplierModel.create({ storeId: req.user.storeId, ...req.body });
    res.status(201).json(supplier);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const supplier = await supplierModel.update(req.params.id, req.user.storeId, req.body);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    res.json(supplier);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await supplierModel.delete(req.params.id, req.user.storeId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
