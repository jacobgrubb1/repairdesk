const express = require('express');
const tagModel = require('../models/tag');
const { authenticate, authorize } = require('../middleware/auth');
const { required } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

// GET /api/tags — list store tags
router.get('/', async (req, res, next) => {
  try {
    const tags = await tagModel.findByStore(req.user.storeId);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/tags — create tag (admin only)
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const err = required(['name'], req.body);
    if (err) return res.status(400).json({ error: err });
    const tag = await tagModel.create({ storeId: req.user.storeId, name: req.body.name, color: req.body.color });
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tags/:id
router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const tag = await tagModel.update(req.params.id, req.user.storeId, req.body);
    res.json(tag);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tags/:id
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await tagModel.delete(req.params.id, req.user.storeId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:ticketId/tags
router.get('/tickets/:ticketId', async (req, res, next) => {
  try {
    const ticketModel = require('../models/ticket');
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const tags = await tagModel.getTicketTags(req.params.ticketId);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/tags/tickets/:ticketId/:tagId — add tag to ticket
router.post('/tickets/:ticketId/:tagId', async (req, res, next) => {
  try {
    const ticketModel = require('../models/ticket');
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await tagModel.addToTicket(req.params.ticketId, req.params.tagId);
    const tags = await tagModel.getTicketTags(req.params.ticketId);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tags/tickets/:ticketId/:tagId — remove tag from ticket
router.delete('/tickets/:ticketId/:tagId', async (req, res, next) => {
  try {
    const ticketModel = require('../models/ticket');
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await tagModel.removeFromTicket(req.params.ticketId, req.params.tagId);
    const tags = await tagModel.getTicketTags(req.params.ticketId);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
