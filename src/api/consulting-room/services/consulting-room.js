'use strict';

/**
 * consulting-room service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::consulting-room.consulting-room');
