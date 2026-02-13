const express = require('express');
const checklistModel = require('../models/checklist');
const ticketModel = require('../models/ticket');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/checklist/device-types — get supported device types
router.get('/checklist/device-types', (req, res) => {
  res.json(checklistModel.getDeviceTypes());
});

// GET /api/checklist/defaults?deviceType=Phone — get default checklist items for a device type
router.get('/checklist/defaults', (req, res) => {
  res.json(checklistModel.getDefaults(req.query.deviceType));
});

// GET /api/tickets/:ticketId/checklist
router.get('/tickets/:ticketId/checklist', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const items = await checklistModel.findByTicket(req.params.ticketId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets/:ticketId/checklist — save checklist items
router.post('/tickets/:ticketId/checklist', async (req, res, next) => {
  try {
    const ticket = await ticketModel.findById(req.params.ticketId, req.user.storeId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (!req.body.items || !Array.isArray(req.body.items)) {
      return res.status(400).json({ error: 'Items array is required' });
    }
    const items = await checklistModel.createForTicket(req.params.ticketId, req.body.items);
    res.status(201).json(items);
  } catch (err) {
    next(err);
  }
});

// PUT /api/checklist/:id — update a single checklist item
router.put('/checklist/:id', async (req, res, next) => {
  try {
    const item = await checklistModel.updateWithOwnerCheck(req.params.id, req.user.storeId, req.body);
    if (!item) return res.status(404).json({ error: 'Checklist item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
