const { getContactByEmail } = require('../services/hubspotService');

// ─── @GET /api/hubspot/contact?email=... ─────────────────────────────────────
// Protected: admin only (applied via route middleware)
const getContact = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email) {
      res.status(400);
      throw new Error('Email query parameter is required');
    }

    const contact = await getContactByEmail(email);

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

module.exports = { getContact };
