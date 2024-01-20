'use strict';

console.log('Rutas del core de consulting-room-history cargadas correctamente.');


/**
 * consulting-room-history router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::consulting-room-history.consulting-room-history');