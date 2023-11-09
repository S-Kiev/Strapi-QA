'use strict';

/**
 * measurements-customer service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::measurements-customer.measurements-customer');
