const express = require('express');
const crm = require('../controllers/crmController');
const { protectAdmin, requireRoles } = require('../middleware/adminAuth');

const router = express.Router();

// Public
router.post('/subscribe', crm.subscribe);
router.post('/contact', crm.createContactLead);

// Admin CRM
router.use(protectAdmin);

router.get('/dashboard', crm.getCrmDashboard);
router.get('/reports', crm.getReports);
router.get('/follow-ups', crm.getFollowUps);

router.get('/customers', crm.listCustomers);
router.post('/customers', crm.createCustomer);
router.get('/customers/:id', crm.getCustomerProfile);
router.patch('/customers/:id', crm.updateCustomer);
router.delete('/customers/:id', crm.deleteCustomer);

router.get('/subscribers', crm.listSubscribers);
router.delete('/subscribers/:id', crm.deleteSubscriber);

router.get('/leads', crm.listLeads);
router.post('/leads', crm.createLead);
router.patch('/leads/:id', crm.updateLead);
router.delete('/leads/:id', crm.deleteLead);

router.get('/campaigns', crm.listCampaigns);
router.post('/campaigns', crm.createCampaign);
router.patch('/campaigns/:id', crm.updateCampaign);
router.delete('/campaigns/:id', crm.deleteCampaign);

router.get('/notifications', crm.listNotifications);
router.post('/notifications/read', crm.markNotificationsRead);

router.get('/settings', crm.getSettings);
router.patch('/settings', requireRoles('superadmin', 'admin', 'manager'), crm.updateSettings);

router.get('/staff', requireRoles('superadmin', 'admin'), crm.listStaff);
router.post('/staff', requireRoles('superadmin', 'admin'), crm.createStaff);
router.patch('/staff/:id', requireRoles('superadmin', 'admin'), crm.updateStaff);

module.exports = router;
