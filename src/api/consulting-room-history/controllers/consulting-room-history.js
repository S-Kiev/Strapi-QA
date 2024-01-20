'use strict';

/**
 * consulting-room-history controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::consulting-room-history.consulting-room-history', ({strapi}) => ({
  async simpleDeleteConsultingRoomHistory(ctx) {
    // @ts-ignore
        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999);

            try {

                const consultingRoomsHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').findMany({
                    where: {
                        since: {
                            $gte: yesterday
                        }
                    }
                });

                console.log(consultingRoomsHistory)

                if(consultingRoomsHistory.length > 0) {
                    console.log("Borra")
                    await Promise.all(consultingRoomsHistory.map(async (consultingRoomHistory) => {
                        await strapi.db.query('api::consulting-room-history.consulting-room-history').delete({
                            where: {
                                id: consultingRoomHistory.id,
                            }
                        });
                    }));

                    const deletionRegister = await strapi.db.query('api::deleted-history.deleted-history').create({
                        data: {
                            historyName: 'consulting-room-history',
                            date: new Date(),
                            publishedAt: new Date()
                        },
                    });

                    if (deletionRegister) {
                        ctx.response.status = 200;
                        ctx.response.body = {
                            message: "Registros de consultorios eliminados con exito",
                            deletionRegister: deletionRegister
                        }
                    }
                }

            } catch (error) {
                ctx.response.status = 500;
                ctx.response.body = {
                    message: "Error inicial al borrar los historiales de consultorios",
                    error: error.message
                }
            }
    } catch (error) {
        ctx.response.status = 405;
        ctx.response.body = {
            message: "Error inicial al procesar la eliminación del historial de consultorios",
            error: error.message
        }
    }
  }
}));
