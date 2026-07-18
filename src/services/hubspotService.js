const hubspotClient = require('../config/hubspot');

/**
 * Create or update a HubSpot contact by email.
 * NOTE: All errors are caught and logged — a HubSpot failure will NEVER block user registration.
 *
 * @param {Object} userData - { name, email, signupSource }
 */
const createOrUpdateContact = async (userData) => {
  if (!hubspotClient) {
    console.warn('[HubSpot] Client not initialized. Skipping contact sync.');
    return null;
  }

  try {
    const { name, email } = userData;
    const firstName = name.split(' ')[0] || name;
    const lastName = name.split(' ').slice(1).join(' ') || '';

    const contactProperties = {
      email,
      firstname: firstName,
      lastname: lastName,
      hs_lead_status: 'NEW',
      lifecyclestage: 'lead',
    };

    // Try to search for existing contact first
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['email', 'firstname', 'lastname', 'hs_lead_status', 'lifecyclestage'],
      limit: 1,
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      // Contact exists — update it
      const existingContactId = searchResponse.results[0].id;
      const updated = await hubspotClient.crm.contacts.basicApi.update(existingContactId, {
        properties: contactProperties,
      });
      console.log(`[HubSpot] Contact updated for email: ${email} (id: ${existingContactId})`);
      return updated;
    }

    // Contact does not exist — create it
    const createResponse = await hubspotClient.crm.contacts.basicApi.create({
      properties: contactProperties,
    });
    console.log(`[HubSpot] New contact created for email: ${email} (id: ${createResponse.id})`);
    return createResponse;
  } catch (error) {
    // Log the error but do NOT re-throw — HubSpot failures must not block registration
    console.error('[HubSpot] Failed to sync contact:', error.message || error);
    return null;
  }
};

/**
 * Get a HubSpot contact by email.
 *
 * @param {string} email
 * @returns {Object|null} contact object or null
 */
const getContactByEmail = async (email) => {
  if (!hubspotClient) {
    console.warn('[HubSpot] Client not initialized. Cannot fetch contact.');
    return null;
  }

  try {
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['email', 'firstname', 'lastname', 'hs_lead_status', 'lifecyclestage'],
      limit: 1,
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      return searchResponse.results[0];
    }

    return null;
  } catch (error) {
    console.error('[HubSpot] Failed to fetch contact by email:', error.message || error);
    return null;
  }
};

module.exports = {
  createOrUpdateContact,
  getContactByEmail,
};
