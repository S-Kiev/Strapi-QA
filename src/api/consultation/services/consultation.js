'use strict';

/**
 * consultation service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::consultation.consultation');
