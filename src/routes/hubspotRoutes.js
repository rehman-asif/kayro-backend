const express = require('express');
const { getContact, syncContact } = require('../controllers/hubspotController');
const { protectAdmin } = require('../middleware/adminAuth');

const router = express.Router();

// @GET  /api/hubspot/contact?email=...  (admin only)
// @POST /api/hubspot/contact             (admin only — create/update)
router.get('/contact', protectAdmin, getContact);
router.post('/contact', protectAdmin, syncContact);

module.exports = router;
