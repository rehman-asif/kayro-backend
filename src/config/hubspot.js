const hubspot = require('@hubspot/api-client');

let hubspotClient = null;

if (process.env.HUBSPOT_ACCESS_TOKEN) {
  hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
} else {
  console.warn('HUBSPOT_ACCESS_TOKEN is missing in environment variables. HubSpot sync will be disabled.');
}

module.exports = hubspotClient;
