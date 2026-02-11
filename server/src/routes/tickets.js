const express = require('express');
const ticketModel = require('../models/ticket');
const { authenticate } = require('../middleware/auth');
const { required } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

// GET /api/tickets
router.get('/', async (req, res, next) => {
  try {
    const tickets = await ticketModel.findByStore(req.user.storeId, {
      status: req.query.status,
      search: req.query.search,
      customerId: req.query.customerId,
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.id, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets
router.post('/', async (req, res, next) => {
  try {
    const err = required(['customerId', 'issueDescription'], req.body);
    if (err) return res.status(400).json({ error: err });

    const ticket = await ticketModel.create({
      storeId: req.user.storeId,
      createdBy: req.user.id,
      ...req.body,
    });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:id
router.put('/:id', async (req, res, next) => {
  try {
    const ticket = await ticketModel.update(req.params.id, req.user.storeId, req.body);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/notes
router.get('/:id/notes', async (req, res, next) => {
  try {
    const notes = await ticketModel.getNotes(req.params.id);
    res.json(notes);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/notes
router.post('/:id/notes', async (req, res, next) => {
  try {
    const err = required(['content'], req.body);
    if (err) return res.status(400).json({ error: err });

    const note = await ticketModel.addNote(
      req.params.id,
      req.user.id,
      req.body.content,
      req.body.isInternal || false
    );
    res.status(201).json(note);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:id/costs
router.get('/:id/costs', async (req, res, next) => {
  try {
    const costs = await ticketModel.getCosts(req.params.id);
    res.json(costs);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:id/costs
router.post('/:id/costs', async (req, res, next) => {
  try {
    const err = required(['description', 'costType', 'amount'], req.body);
    if (err) return res.status(400).json({ error: err });

    const cost = await ticketModel.addCost(req.params.id, req.body);
    res.status(201).json(cost);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/tickets/:id/costs/:costId
router.delete('/:id/costs/:costId', async (req, res, next) => {
  try {
    await ticketModel.deleteCost(req.params.costId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
