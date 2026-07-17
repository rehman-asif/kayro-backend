const express = require('express');
const { getContact } = require('../controllers/hubspotController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// ─── Routes ───────────────────────────────────────────────────────────────────

// @GET /api/hubspot/contact?email=...  (admin only)
router.get('/contact', protectAdmin, getContact);

module.exports = router;
