const express = require('express');
const customerModel = require('../models/customer');
const { authenticate } = require('../middleware/auth');
const { required } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

// GET /api/customers
router.get('/', async (req, res, next) => {
  try {
    const customers = await customerModel.findByStore(req.user.storeId, {
      search: req.query.search,
    });
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await customerModel.findById(req.params.id, req.user.storeId);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post('/', async (req, res, next) => {
  try {
    const err = required(['name'], req.body);
    if (err) return res.status(400).json({ error: err });

    const customer = await customerModel.create({
      storeId: req.user.storeId,
      ...req.body,
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res, next) => {
  try {
    const err = required(['name'], req.body);
    if (err) return res.status(400).json({ error: err });

    const customer = await customerModel.update(req.params.id, req.user.storeId, req.body);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
