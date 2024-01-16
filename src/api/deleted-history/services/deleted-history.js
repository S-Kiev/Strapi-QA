'use strict';

/**
 * deleted-history service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::deleted-history.deleted-history');
