'use strict';
// @ts-nocheck


const { createCoreController } = require('@strapi/strapi').factories;


module.exports = createCoreController('api::consultation.consultation');

/*

, ({ strapi }) =>  ({
    // Method 1: Creating an entirely custom action
    async exampleAction(ctx) {
      try {
        console.log(ctx);
      } catch (err) {
        ctx.body = err;
      }
    }
})


    plugin.controllers.user.botUpdate = async (ctx) => {
        try {
            
        } catch (error) {
            ctx.body = error;
        }
    }

    module.exports = (plugin) => {
    createCoreController('api::consultation.consultation', plugin.controllers.user.botCreate = async (ctx) => {
        // Resto del código
    });
};
    */
