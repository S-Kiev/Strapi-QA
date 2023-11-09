'use strict';

/**
 * customer-payment service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::customer-payment.customer-payment');
