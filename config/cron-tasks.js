//const { sendNotifyByWhatsapp } = require('./sendNotifyByWhatsapp');
const { sendNotifyTemplateToCollaborator, sendNotifyTemplateToCustomer } = require('./sendNotifyTemplate');


module.exports = {

    //NOTIFICACIONES
    notifyCollaborators: {

        task: async function ({ strapi }) {

            const thisMoment = new Date();

            const fifteenMinutesBefore = new Date();
            fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() + 15);


            const consultingRoomsOccupiedfifteenMinutesBefore = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
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
                    consultation: true,
                },
            });


            if (consultingRoomsOccupiedfifteenMinutesBefore.length > 0) {

                const collaborators = await Promise.all(consultingRoomsOccupiedfifteenMinutesBefore
                    .map(async collaborator => {

                        const collaboratorInfo = await strapi.db.query('api::consultation.consultation').findOne({
                            where: {
                                id: collaborator.consultation.id,
                            },
                            populate: {
                                responsibleUser: true,
                                customer: true,
                            }
                        });

                        return {
                            collaborator: collaboratorInfo.responsibleUser,
                            customer: collaboratorInfo.customer,
                            hour: collaborator.since
                        };
                    }));

                if(collaborators.length > 0) {
                    await Promise.all(collaborators.map(async (notify) => {
                        const customerName = notify.customer.name;
                        const customerLastname = notify.customer.lastname;
                        const customerCellphone = notify.customer.cellphone;
                        const customerProfession = notify.customer.profession;
                        const customerAddress = notify.customer.address;
    
                        const collaboratorName = notify.collaborator.name;
                        const collaboratorCellphone = notify.collaborator.cellphone;
                        await sendNotifyTemplateToCollaborator(collaboratorCellphone, collaboratorName, customerName, customerLastname, customerProfession, customerAddress, customerCellphone);
                    }));

                    await Promise.all(consultingRoomsOccupiedfifteenMinutesBefore.map(async (consultingRooms) => {
                        return strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').update({
                            where: {
                                id: consultingRooms.id
                            },
                            data:
                                { notifyUser: true }
                        });
                    }));
                }

            }
        },
        options: {
            //'10 * * * * *' => 10s
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
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


            const consultingRoomsOccupiedTomorrow = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
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
                    consultation: true,
                },
            });

            if (consultingRoomsOccupiedTomorrow.length > 0) {

                const hour = consultingRoomsOccupiedTomorrow[0].since;

                //console.log(consultingRoomsOccupiedTomorrow);

                const customer = await Promise.all(consultingRoomsOccupiedTomorrow
                    .map(async consultingRoom => {
                        const consultationInfo = await strapi.db.query('api::consultation.consultation').findOne({
                            where: {
                                id: consultingRoom.consultation.id,
                            },
                            populate: {
                                customer: true,
                            },
                        });

                        return {
                            customer: consultationInfo.customer,
                            hour: consultingRoom.since, 
                        };
                    }));

                if (customer.length > 0) {
                    await Promise.all(customer.map(async (notify) => {
                        const name = notify.customer.name;
                        const lastname = notify.customer.lastname;
                        const cellphone = notify.customer.cellphone;
                        await sendNotifyTemplateToCustomer(cellphone, name, lastname, hour);
                    }));

                    await Promise.all(consultingRoomsOccupiedTomorrow.map(async (consultingRooms) => {
                        return strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').update({
                            where: {
                                id: consultingRooms.id
                            },
                            data:
                                { notifyCustomer: true }
                        });
                    }));
                }
            }
        },
        options: {
            rule: '*/30 * * * * *', //=> 15s
            tz: 'America/Montreal'
        }

    },

    //CONSULTATIONS


    automaticallySwitchInProgressStatusConsultation: {
        task: async function ({ strapi }) {

            const thisMoment = new Date();

            const historyConsultationConsultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where: {
                    since: {
                        $lte: thisMoment
                    },
                    until: {
                        $gte: thisMoment
                    }
                },
                populate: {
                    consultation: true
                }
            });

            //console.log("historyConsultationConsultingRooms en horario de consulta =>");
            //console.log(historyConsultationConsultingRooms);

            if (historyConsultationConsultingRooms.length > 0){
                await Promise.all(historyConsultationConsultingRooms.map(historyConsultationConsultingRoom => {
                    return strapi.db.query('api::consultation.consultation').update({
                        where: {
                            id: historyConsultationConsultingRoom.consultation.id,
                        },
                        data:
                            { status: 'in progress' }
                    });
                }));
            }
        },
        options: {
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
        }
    },

    automaticallySwitchFinishStatusConsultation: {
        task: async function ({ strapi }) {
            const thisMoment = new Date();

            const historyConsultationConsultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where: {
                    until: {
                        $lte: thisMoment
                    }
                },
                populate: {
                    consultation: true
                }
            });


            //console.log("historyConsultationRoomsHistory Que paso la hora =>");
            //console.log(historyConsultationConsultingRooms);

            
            if (historyConsultationConsultingRooms.length > 0){
                await Promise.all(historyConsultationConsultingRooms.map(historyConsultationConsultingRoom => {
                    return strapi.db.query('api::consultation.consultation').update({
                        where: {
                            id: historyConsultationConsultingRoom.consultation.id,
                        },
                        data:
                            { status: 'finish' }
                    });
                }));
            };
        },
        options: {
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
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

            console.log("historyEquitments en horario de consulta =>");

            console.log(historyEquitments);

    
            if (historyEquitments.length > 0){
                await Promise.all(historyEquitments.map(historyEquitment => {
                    return strapi.db.query('api::equipment.equipment').update({
                        where: {
                            id: historyEquitment.equipment.id,
                        },
                        data:
                            { status: historyEquitment.status }
                    });
                }));
            };
        },
        options: {
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
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
            //console.log("historyEquitments Que paso la hora =>");

            //console.log(historyEquitments);

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
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
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

            //console.log("historyConsutingRooms en horario de consulta =>");

            //console.log(historyConsutingRooms);

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
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
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
            //console.log("consutingRooms Que paso la hora =>");

            //console.log(historyConsutingRooms);

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
            rule: '*/30 * * * * *',
            tz: 'America/Montreal'
        }
    }
}