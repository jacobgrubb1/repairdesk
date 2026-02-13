const express = require('express');
const notificationModel = require('../models/notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/notifications
router.get('/', async (req, res, next) => {
  try {
    const notifications = await notificationModel.findForUser(req.user.id, req.user.storeId);
    const unreadCount = await notificationModel.countUnread(req.user.id, req.user.storeId);
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res, next) => {
  try {
    await notificationModel.markRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res, next) => {
  try {
    await notificationModel.markAllRead(req.user.id, req.user.storeId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
