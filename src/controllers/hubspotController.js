const { getContactByEmail, createOrUpdateContact } = require('../services/hubspotService');

// ─── @GET /api/hubspot/contact?email=... ─────────────────────────────────────
const getContact = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      res.status(400);
      throw new Error('Email query parameter is required');
    }

    const contact = await getContactByEmail(String(email).trim().toLowerCase());

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: `No HubSpot contact found for email: ${email}`,
      });
    }

    res.status(200).json({
      success: true,
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

// ─── @POST /api/hubspot/contact ───────────────────────────────────────────────
// Body: { email, name? } — create or update contact in HubSpot (admin only)
const syncContact = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || email.split('@')[0] || 'Customer').trim();

    if (!email) {
      res.status(400);
      throw new Error('Email is required');
    }

    const contact = await createOrUpdateContact({ name, email });

    if (!contact) {
      return res.status(503).json({
        success: false,
        message:
          'HubSpot sync failed. Check HUBSPOT_ACCESS_TOKEN on the server and Private App scopes (contacts read/write).',
      });
    }

    // Re-fetch so properties are complete for the UI
    const full = (await getContactByEmail(email)) || contact;

    res.status(200).json({
      success: true,
      message: 'Contact synced to HubSpot',
      data: full,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getContact, syncContact };
