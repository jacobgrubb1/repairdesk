const express = require('express');
const photoModel = require('../models/photo');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/tickets/:ticketId/photos', async (req, res, next) => {
  try {
    res.json(await photoModel.findByTicket(req.params.ticketId));
  } catch (err) { next(err); }
});

router.post('/tickets/:ticketId/photos', async (req, res, next) => {
  try {
    const { url, caption, photoType } = req.body;
    if (!url) return res.status(400).json({ error: 'Photo URL/data is required' });
    if (!['intake', 'repair', 'completion'].includes(photoType)) {
      return res.status(400).json({ error: 'photoType must be intake, repair, or completion' });
    }
    const photo = await photoModel.create({
      ticketId: req.params.ticketId,
      storeId: req.user.storeId,
      url, caption, photoType,
      takenBy: req.user.id,
    });
    res.status(201).json(photo);
  } catch (err) { next(err); }
});

router.delete('/tickets/:ticketId/photos/:photoId', async (req, res, next) => {
  try {
    await photoModel.delete(req.params.photoId, req.user.storeId);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
