const express = require('express');
const cannedResponseModel = require('../models/cannedResponse');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/canned-responses
router.get('/', async (req, res, next) => {
  try {
    const responses = await cannedResponseModel.findByStore(req.user.storeId);
    res.json(responses);
  } catch (err) {
    next(err);
  }
});

// POST /api/canned-responses
router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content are required' });

    const response = await cannedResponseModel.create({
      storeId: req.user.storeId,
      title,
      content,
      category,
    });
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
});

// PUT /api/canned-responses/:id
router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const response = await cannedResponseModel.update(req.params.id, req.user.storeId, req.body);
    if (!response) return res.status(404).json({ error: 'Not found' });
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/canned-responses/:id
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    await cannedResponseModel.delete(req.params.id, req.user.storeId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
