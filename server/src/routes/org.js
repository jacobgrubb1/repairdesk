const express = require('express');
const orgModel = require('../models/organization');
const storeModel = require('../models/store');
const { authenticate, authorize, authorizeOrg } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// POST /api/org/setup — create organization and link current store
router.post('/setup', authorize('admin'), async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required' });

    const store = await storeModel.findById(req.user.storeId);
    if (store.organization_id) return res.status(400).json({ error: 'Store already belongs to an organization' });

    const org = await orgModel.create({ name });
    await orgModel.addStore(org.id, req.user.storeId);

    // Set current user as org_admin
    const db = require('../config/db');
    await db.run('UPDATE users SET org_role = $1 WHERE id = $2', ['org_admin', req.user.id]);

    res.status(201).json(org);
  } catch (err) { next(err); }
});

// GET /api/org/stores
router.get('/stores', authorizeOrg('org_admin', 'org_viewer'), async (req, res, next) => {
  try {
    const store = await storeModel.findById(req.user.storeId);
    if (!store.organization_id) return res.status(400).json({ error: 'Not part of an organization' });
    res.json(await orgModel.getStores(store.organization_id));
  } catch (err) { next(err); }
});

// GET /api/org/dashboard
router.get('/dashboard', authorizeOrg('org_admin', 'org_viewer'), async (req, res, next) => {
  try {
    const store = await storeModel.findById(req.user.storeId);
    if (!store.organization_id) return res.status(400).json({ error: 'Not part of an organization' });
    res.json(await orgModel.getDashboard(store.organization_id));
  } catch (err) { next(err); }
});

// POST /api/org/stores — create new store in org
router.post('/stores', authorizeOrg('org_admin'), async (req, res, next) => {
  try {
    const store = await storeModel.findById(req.user.storeId);
    if (!store.organization_id) return res.status(400).json({ error: 'Not part of an organization' });
    if (!req.body.name) return res.status(400).json({ error: 'Store name is required' });
    const newStore = await orgModel.createStore(store.organization_id, req.body);
    res.status(201).json(newStore);
  } catch (err) { next(err); }
});

// POST /api/org/transfer/:ticketId — transfer ticket to another store
router.post('/transfer/:ticketId', authorizeOrg('org_admin'), async (req, res, next) => {
  try {
    const { toStoreId, reason } = req.body;
    if (!toStoreId) return res.status(400).json({ error: 'Target store is required' });

    // Verify both stores belong to the same organization
    const fromStore = await storeModel.findById(req.user.storeId);
    const toStore = await storeModel.findById(toStoreId);
    if (!fromStore || !toStore) return res.status(404).json({ error: 'Store not found' });
    if (!fromStore.organization_id || fromStore.organization_id !== toStore.organization_id) {
      return res.status(403).json({ error: 'Cannot transfer to a store outside your organization' });
    }

    const result = await orgModel.transferTicket(req.params.ticketId, req.user.storeId, toStoreId, req.user.id, reason);
    res.json(result);
  } catch (err) { next(err); }
});

// GET /api/org/inventory — cross-store inventory
router.get('/inventory', authorizeOrg('org_admin', 'org_viewer'), async (req, res, next) => {
  try {
    const store = await storeModel.findById(req.user.storeId);
    if (!store.organization_id) return res.status(400).json({ error: 'Not part of an organization' });
    res.json(await orgModel.getInventory(store.organization_id));
  } catch (err) { next(err); }
});

module.exports = router;
