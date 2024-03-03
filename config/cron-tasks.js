//const { sendNotifyByWhatsapp } = require('./sendNotifyByWhatsapp');
const { sendNotifyTemplateToCollaborator, sendNotifyTemplateToCustomer } = require('./sendNotifyTemplate');


module.exports = {

    //NOTIFICACIONES
    notifyCollaborators: {

        task: async function ({ strapi }) {

            const thisMoment = new Date();

            const fifteenMinutesBefore = new Date();
            fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() + 15);

            const consultations = await strapi.db.query('api::consultation.consultation').findMany({
                where: {
                    since: {
                        $gte: thisMoment,
                        $lte: fifteenMinutesBefore
                    },
                    notifyUser: {
                        $eq: false
                    }
                },
                populate: {
                    responsibleUser: true,
                    customer: true,
                }
            });



                if(consultations.length > 0) {

                    await Promise.all(consultations.map( async (consultation) => {
                        const customerName = consultation.customer.name;
                        const customerLastname = consultation.customer.lastname;
                        const customerCellphoneStrapi = consultation.customer.cellphone;
                        const customerProfession = consultation.customer.profession;
                        const customerAddress = consultation.customer.address;
    
                        const collaboratorName = consultation.responsibleUser.name;
                        const collaboratorCellphone = consultation.responsibleUser.cellphone;

                        //Si la clinica tiene clientes internacionales aqui expandir logica (de zona horaria) segun caracteristica del pais
                        const countryCode = customerCellphoneStrapi.substring(0, 3);
                        const numberWithoutCountryCode = customerCellphoneStrapi.substring(3);
                        const customerCellphone = "0" + numberWithoutCountryCode;

                        await sendNotifyTemplateToCollaborator(collaboratorCellphone, collaboratorName, customerName, customerLastname, customerProfession, customerAddress, customerCellphone);
                    }));

                    await Promise.all(consultations.map(async (consultation) => {
                        return strapi.db.query('api::consultation.consultation').update({
                            where: {
                                id: consultation.id
                            },
                            data:
                                { notifyUser: true }
                        });
                    }));

            }
        },
        options: {
            rule: '*/5 * * * *',
            tz: 'America/Montevideo'
        }
    },
    notifyCustomers: {

        task: async function ({ strapi }) {

            const tomorrowStart = new Date();
            tomorrowStart.setDate(tomorrowStart.getDate() + 1); // Agregar un día
            tomorrowStart.setHours(0, 0, 0, 0); // Establecer la hora a 00:00:00

            const tomorrowEnd = new Date();
            tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
            tomorrowEnd.setHours(23, 59, 59, 999);


            const consultations = await strapi.db.query('api::consultation.consultation').findMany({
                where: {
                    since: {
                        $gte: tomorrowStart,
                        $lte: tomorrowEnd
                    },
                    notifyCustomer: {
                        $eq: false
                    }
                },
                populate: {
                    customer: true,
                }
            });


            if (consultations.length > 0) {
                await Promise.all(consultations.map(async (consultation) => {
                        const name = consultation.customer.name;
                        const lastname = consultation.customer.lastname;
                        const cellphone = consultation.customer.cellphone;
                        await sendNotifyTemplateToCustomer(cellphone, name, lastname, consultation.since);
                }));

                await Promise.all(consultations.map(async (consultation) => {
                    return strapi.db.query('api::consultation.consultation').update({
                            where: {
                                id: consultation.id
                            },
                            data:
                                { notifyCustomer: true }
                        });
                }));
            }
        },
        options: {
            rule: '0 9 * * *',
            tz: 'America/Montevideo'
        }

    },

    //CONSULTATIONS


    automaticallySwitchInProgressStatusConsultation: {
        task: async function ({ strapi }) {

            const thisMoment = new Date();

            //Cambiar a esta fuente: 'api::consultation.consultation'
            const consultations = await strapi.db.query('api::consultation.consultation').findMany({
                where: {
                    since: {
                        $lte: thisMoment
                    },
                    until: {
                        $gte: thisMoment
                    },
                    status: {
                        $eq: 'pending'
                    }
                }
            });


            if (consultations.length > 0){
                await Promise.all(consultations.map(consultation => {
                    return strapi.db.query('api::consultation.consultation').update({
                        where: {
                            id : consultation.id,
                            status : 'pending'
                        },
                        data:
                            { status: 'in progress' }
                    });
                }));
            }
        },
        options: {
            rule: '*/5 * * * *',
            tz: 'America/Montevideo'
        }
    },

    automaticallySwitchFinishStatusConsultation: {
        task: async function ({ strapi }) {
            const thisMoment = new Date();

            const completedConsultations = await strapi.db.query('api::consultation.consultation').findMany({
                where: {
                    until: {
                        $gte: thisMoment
                    },
                    status: {
                        $eq: 'in progress'
                    }
                }
            });

            
            if (completedConsultations.length > 0){
                await Promise.all(completedConsultations.map(consultation => {
                    return strapi.db.query('api::consultation.consultation').update({
                        where: {
                            id: consultation.id
                        },
                        data:
                            { status: 'finish' }
                    });
                }));
            };
        },
        options: {
            rule: '* */30 * * * *',
            tz: 'America/Montevideo'
        }
    },

    //EQUITMENTS

    automaticallySwitchStatusEquitments: {
        task: async function ({ strapi }) {

            const thisMoment = new Date();

            const historyEquitments = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                where: {
                    since: {
                        $lte: thisMoment
                    },
                    until: {
                        $gte: thisMoment
                    }
                },
                populate: {
                    equipment : true
                }
            });

    
            if (historyEquitments.length > 0){
                await Promise.all(historyEquitments.map(historyEquitment => {
                    //Si elequipo esta broken que ignore cualquier accion
                    if (historyEquitment.equipment.status !== 'broken'){
                        return strapi.db.query('api::equipment.equipment').update({
                            where: {
                                id: historyEquitment.equipment.id,
                            },
                            data:
                                { status: historyEquitment.status }
                        });
                    }

                }));
            };
        },
        options: {
            rule: '*/5 * * * *',
            tz: 'America/Montevideo'
        }
    },

    
    automaticallySwitchAvailableStatusEquitments: {
        task: async function ({ strapi }) {

            const thisMoment = new Date();

            const historyEquitments = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                where: {
                    until: {
                        $lte: thisMoment
                    }
                },
                populate: {
                    equipment : true
                }
            });

            if (historyEquitments.length > 0) {
                await Promise.all(historyEquitments.map(historyEquitment => {
                    return strapi.db.query('api::equipment.equipment').update({
                        where: {
                            id: historyEquitment.equipment.id,
                        },
                        data:
                            { status: 'available' }
                    });
                }));
            }
        },
        options: {
            rule: '* */30 * * * *',
            tz: 'America/Montevideo'
        }
    },

    //CONSULTING ROOMS

    automaticallySwitchStatusConsultingRooms: {
        task: async function ({ strapi }) {

            const thisMoment = new Date();

            const historyConsutingRooms = await strapi.db.query('api::consulting-room-history.consulting-room-history').findMany({
                where: {
                    since: {
                        $lte: thisMoment
                    },
                    until: {
                        $gte: thisMoment
                    }
                },
                populate: {
                    consulting_room : true
                }
            });

            if (historyConsutingRooms.length > 0){
                await Promise.all(historyConsutingRooms.map(historyConsutingRoom => {
                    return strapi.db.query('api::consulting-room.consulting-room').update({
                        where: {
                            id: historyConsutingRoom.consulting_room.id,
                        },
                        data:
                            { status: historyConsutingRoom.status }
                    });
                }));
            }
        },
        options: {
            rule: '*/5 * * * *',
            tz: 'America/Montevideo'
        }
    },

    automaticallySwitchAvailableStatusConsultingRooms: {
        task: async function ({ strapi }) {
            const thisMoment = new Date();

            const historyConsutingRooms = await strapi.db.query('api::consulting-room-history.consulting-room-history').findMany({
                where: {
                    until: {
                        $lte: thisMoment
                    }
                },
                populate: {
                    consulting_room : true
                }
            });


            if (historyConsutingRooms.length > 0){
                await Promise.all(historyConsutingRooms.map(historyConsutingRoom => {
                    return strapi.db.query('api::consulting-room.consulting-room').update({
                        where: {
                            id: historyConsutingRoom.consulting_room.id,
                        },
                        data:
                            { status: 'available' }
                    });
                }));
            }
        },
        options: {
            rule: '*/5 * * * *',
            tz: 'America/Montevideo'
        }
    }
}