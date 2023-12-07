'use strict';
// @ts-nocheck


const { createCoreController } = require('@strapi/strapi').factories;


module.exports = createCoreController('api::consultation.consultation');

/*
const customControllers = (plugin) => { 
    
plugin.controllers.consultation.botCreate = async (ctx) => {
        try {
            if (ctx.body && ctx.body.userNumber && ctx.body.customerName && ctx.body.customerLastname && ctx.body.dateSince && ctx.body.dateUntil && ctx.body.treatmentName && ctx.body.consultingRoomName){
                const customer = await strapi.db.query('api::customer-personal-information.customer-personal-information').findOne({
                    where: { 
                        name: ctx.body.customerName,
                        lastname: ctx.body.customerLastname
                    }
                });
                if(customer){
                    const user = await strapi.db.query('api::user-data.user-data').findOne({
                        where: { 
                            cellphone: ctx.body.userNumber,
                        }
                    });
                    if(user){
                        const treatment = await strapi.db.query('api::treatment.treatment').findOne({
                            where: { 
                                name: ctx.body.treatmentName,
                            },
                            populate: {
                                equitment: true,
                            }
                        });

                        if (treatment){
                            const consultingRoom = await strapi.db.query('api::consulting-room.consulting-room').findOne({
                                where: { 
                                    name: ctx.body.consultingRoomName,
                                }
                            });

                            if(consultingRoom) {
                                const availableRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findOne({
                                    where: { 
                                        since: { $gte : ctx.body.dateSince},
                                        until: { $lte : ctx.body.dateUntil},
                                        consultingRoom: consultingRoom.id
                                    }
                                });

                                //Si no hay una consulta a esa hora en ese consultorio puedo proceder
                                if(!availableRoom){

                                const notAvailableEquitments = await Promise.all(treatment.equipment.map(async equitment => {

                                        const notAvailableEquitment = await strapi.db.query('api::equipment-history.equipment-history').findOne({
                                                        where: { 
                                                            since: { $gte : ctx.body.dateSince},
                                                            until: { $lte : ctx.body.dateUntil},
                                                            equipment: equitment.id,
                                                            $or : [
                                                                {status : 'occupied'},
                                                                {status : 'rented'},
                                                                {status : 'broken'},
                                                            ]
                                                        }
                                        });
                                
                                        return notAvailableEquitment
                                    }));


                                    if(!notAvailableEquitments){
                                        //Comenzar con la incercion de datos












                                        
                                    }
                                    else {
                                        ctx.body = {
                                            message : "Este equipo ya esta reservado o no disponible para la fecha indicada"
                                        } 
                                    }
                                }
                                else {
                                    ctx.body = {
                                        message : "Este consultorio ya esta reservado para la fecha indicada"
                                    }  
                                }
                            }
                            else {
                                ctx.body = {
                                    message : "No se pudo identificar el consultorio"
                                }
                            }
                        }
                        else {
                            ctx.body = {
                                message : "No se pudo identificar al tratamiento"
                            }
                        }
                    }
                    else {
                        ctx.body = {
                            message : "No se pudo identificar a la colaboradora"
                        }
                    }
                }
                else {
                    ctx.body = {
                        message : "No se pudo identificar al cliente"
                    }
                }
            }
            else {
                ctx.body = {
                    message : "Faltan datos para poder crear una consulta"
                }
            }
        } catch (error) {
            ctx.body = error;
        }

}

plugin.controllers.consultation.botUpdate = async (ctx) => {
    try {
        
    } catch (error) {
        
    }
}
}

module.exports = {
    ...coreController,
    ...customControllers,
  };
  */
