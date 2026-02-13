const express = require('express');
const { authenticate, authorizePlatform } = require('../middleware/auth');
const platform = require('../models/platform');

const router = express.Router();

router.use(authenticate, authorizePlatform);

// GET /api/platform/metrics
router.get('/metrics', async (req, res, next) => {
  try {
    const metrics = await platform.getMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /api/platform/stores
router.get('/stores', async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await platform.getAllStores({
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/platform/stores/:id
router.put('/stores/:id', async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive (boolean) is required' });
    }
    const store = await platform.toggleStoreActive(req.params.id, isActive);
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (err) {
    next(err);
  }
});

// GET /api/platform/users
router.get('/users', async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;
    const result = await platform.getAllUsers({
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 25,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// PUT /api/platform/users/:id/platform-role
router.put('/users/:id/platform-role', async (req, res, next) => {
  try {
    const { platformRole } = req.body;
    if (platformRole !== null && platformRole !== 'platform_admin') {
      return res.status(400).json({ error: 'platformRole must be "platform_admin" or null' });
    }
    const user = await platform.setUserPlatformRole(req.params.id, platformRole);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
