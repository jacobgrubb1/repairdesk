const express = require('express');
const suggestionModel = require('../models/suggestion');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/suggestions', async (req, res, next) => {
  try {
    const { deviceType, keywords } = req.query;
    res.json(await suggestionModel.getSuggestions(req.user.storeId, { deviceType, keywords }));
  } catch (err) { next(err); }
});

router.get('/suggestions/price', async (req, res, next) => {
  try {
    const { deviceType, keywords } = req.query;
    res.json(await suggestionModel.getPriceEstimate(req.user.storeId, { deviceType, keywords }));
  } catch (err) { next(err); }
});

router.get('/suggestions/time', async (req, res, next) => {
  try {
    const { deviceType, keywords } = req.query;
    res.json(await suggestionModel.getTimeEstimate(req.user.storeId, { deviceType, keywords }));
  } catch (err) { next(err); }
});

router.get('/knowledge-base', async (req, res, next) => {
  try {
    const { deviceType, search, page, limit } = req.query;
    res.json(await suggestionModel.getKnowledgeBase(req.user.storeId, {
      deviceType, search,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    }));
  } catch (err) { next(err); }
});

module.exports = router;
