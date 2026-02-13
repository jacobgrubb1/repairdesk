const express = require('express');
const templateModel = require('../models/template');
const { authenticate, authorize } = require('../middleware/auth');
const { required } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

// GET /api/templates
router.get('/', async (req, res, next) => {
  try {
    res.json(await templateModel.findByStore(req.user.storeId));
  } catch (err) {
    next(err);
  }
});

// POST /api/templates (admin only)
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const err = required(['name'], req.body);
    if (err) return res.status(400).json({ error: err });

    const template = await templateModel.create({ storeId: req.user.storeId, ...req.body });
    res.status(201).json(template);
  } catch (err) {
    next(err);
  }
});

// PUT /api/templates/:id
router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const template = await templateModel.update(req.params.id, req.user.storeId, req.body);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/templates/:id
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await templateModel.delete(req.params.id, req.user.storeId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/templates/:templateId/apply/:ticketId
router.post('/:templateId/apply/:ticketId', async (req, res, next) => {
  try {
    const costs = await templateModel.applyToTicket(req.params.templateId, req.params.ticketId, req.user.storeId);
    if (!costs) return res.status(404).json({ error: 'Template not found' });
    res.json(costs);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
