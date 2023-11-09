'use strict';

/**
 * recovery-code service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::recovery-code.recovery-code');
