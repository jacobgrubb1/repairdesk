const express = require('express');
const warrantyModel = require('../models/warranty');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/tickets/:ticketId/warranty
router.get('/tickets/:ticketId/warranty', async (req, res, next) => {
  try {
    const warranty = await warrantyModel.findByTicket(req.params.ticketId);
    res.json(warranty || null);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:ticketId/warranty
router.post('/tickets/:ticketId/warranty', async (req, res, next) => {
  try {
    const warranty = await warrantyModel.create({
      ticketId: req.params.ticketId,
      storeId: req.user.storeId,
      warrantyDays: req.body.warrantyDays || 30,
      warrantyTerms: req.body.warrantyTerms,
    });
    res.status(201).json(warranty);
  } catch (err) {
    next(err);
  }
});

// PUT /api/warranties/:id
router.put('/:id', async (req, res, next) => {
  try {
    const warranty = await warrantyModel.update(req.params.id, req.body);
    res.json(warranty);
  } catch (err) {
    next(err);
  }
});

// GET /api/warranties/check — check warranty returns
router.get('/check', async (req, res, next) => {
  try {
    const { customerId, deviceBrand, deviceModel } = req.query;
    if (!customerId || !deviceBrand || !deviceModel) {
      return res.json([]);
    }
    const warranties = await warrantyModel.checkWarrantyReturn(
      req.user.storeId, customerId, deviceBrand, deviceModel
    );
    res.json(warranties);
  } catch (err) {
    next(err);
  }
});

// GET /api/warranties/active — active warranties for the store
router.get('/active', async (req, res, next) => {
  try {
    const warranties = await warrantyModel.getActiveWarranties(req.user.storeId);
    res.json(warranties);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
