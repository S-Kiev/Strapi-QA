//const { sendNotifyByWhatsapp } = require('./sendNotifyByWhatsapp');
const { sendNotifyTemplateToCollaborator, sendNotifyTemplateToCustomer } = require('./sendNotifyTemplate');


module.exports = {
            
    notifyCollaborators : {

        task: async function ({strapi}){
            
            const thisMoment = new Date();

            const fifteenMinutesBefore = new Date();
            fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() + 15);

            console.log("thisMoment");

            console.log(thisMoment);

            console.log("fifteenMinutesBefore");
            console.log(fifteenMinutesBefore);


            const consultingRoomsOccupiedfifteenMinutesBefore = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    since : {
                        $gte: thisMoment,
                        $lte: fifteenMinutesBefore  
                    },
                    notifyUser : {
                        $eq: false
                    }
                },
                populate: {
                    consultation: true,
                },
            });

            console.log("Consultorios ocupados 15 minustos antes =>");
            console.log(consultingRoomsOccupiedfifteenMinutesBefore);
            

            if(consultingRoomsOccupiedfifteenMinutesBefore.length > 0) {

                const collaborators = await Promise.all(consultingRoomsOccupiedfifteenMinutesBefore
                    .map(async collaborator => {
                        
                    const collaboratorInfo = await strapi.db.query('api::consultation.consultation').findOne({
                        where : {
                            id : collaborator.consultation.id,
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

                console.log("Esta son los colaboradores =>" + collaborators);

                await Promise.all(collaborators.map(async (notify) =>{
    
                    //USAR MENSAJE DE TEMPLATE??
                    const customerName = notify.customer.name;
                    const customerLastname = notify.customer.lastname;
                    const customerCellphone = notify.customer.cellphone;
                    const customerProfession = notify.customer.profession;
                    const customerAddress = notify.customer.address;
    
                    const collaboratorName = notify.collaborator.name;
                    const collaboratorCellphone = notify.collaborator.cellphone;
                    console.log
    
                    //const message = `Hola ${collaboratorName}, te recuerdo que en 15 minutos aproximadamente, a la hora ${notify.hour}, tienes consulta con ${customerName} ${customerLastname}; el ${customerProfession} de ${customerAddress}. Cualquier inconveniente avisale a ${customerCellphone}.`;
                    //console.log(message);
                    //console.log(collaboratorCellphone);

                    //await sendNotifyByWhatsapp(message, collaboratorCellphone);

                    //PLAN B
                    await sendNotifyTemplateToCollaborator(collaboratorCellphone, collaboratorName, customerName, customerLastname, customerProfession, customerAddress, customerCellphone);
                    
                }));
            }

            await Promise.all(consultingRoomsOccupiedfifteenMinutesBefore.map(async (consultingRooms) => {
                return strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').update({  
                    where: {
                        id: consultingRooms.id
                    },
                    data : 
                     { notifyUser: true }
                });
            }));
            
        },
        options : {
            //'10 * * * * *' => 10s
            //rule : '* * * * * *',
            tz: 'America/Montreal'
        }
    },
    notifyCustomers : {
        //Maldito TypeScript

        task: async function ({strapi}){
            
            const tomorrowStart = new Date();
            tomorrowStart.setDate(tomorrowStart.getDate() + 1); // Agregar un día
            tomorrowStart.setHours(0, 0, 0, 0); // Establecer la hora a 00:00:00

            const tomorrowEnd = new Date();
            tomorrowEnd.setDate(tomorrowEnd.getDate() + 1); 
            tomorrowEnd.setHours(23, 59, 59, 999); 
            
            console.log("Mañana Inicio =>" + tomorrowStart);
            console.log("Mañana Fin =>" + tomorrowEnd);
            

            const consultingRoomsOccupiedTomorrow = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    since : {
                        $gte: tomorrowStart,
                        $lte: tomorrowEnd  
                    },
                    notifyCustomer : {
                        $eq: false
                    }
                },
                populate: {
                  consultation: true,
                },
            });
            console.log("Consultorios ocupados mañana =>");

            console.log(consultingRoomsOccupiedTomorrow);

            if (consultingRoomsOccupiedTomorrow.length > 0) {

                const hour = consultingRoomsOccupiedTomorrow[0].since;

                //console.log(consultingRoomsOccupiedTomorrow);

                const customer = await Promise.all(consultingRoomsOccupiedTomorrow
                    .map(async consultingRoom => {
                        console.log("Este es el id de la consulta =>" + consultingRoom.consultation.id);
                        console.log(consultingRoom.id);
                
                        // Obtener información de la consulta, incluyendo la hora de inicio
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
                            hour: consultingRoom.since, // Incluir la hora de inicio en el resultado
                        };
                    }));

                console.log(customer);
                console.log(customer);

    
                await Promise.all(customer.map(async (notify) => {
                    console.log("Este es el notify =>" + notify);
                    console.log("Este es el notify.custumer =>" + notify.customer);

                    
                    const name = notify.customer.name;
                    const lastname = notify.customer.lastname;
                    const cellphone = notify.customer.cellphone;
                
                    //const message = `Hola ${name} ${lastname}, te recordamos que el día de mañana a la hora ${hour} tienes consulta en nuestra clínica. Favor de confirmar`;
                    //console.log(message);
                    //console.log(cellphone);

                    //await sendNotifyByWhatsapp(message, cellphone);
                    
                    //PLAN B
                    await sendNotifyTemplateToCustomer(cellphone, name, lastname, hour);
                }));

                await Promise.all(consultingRoomsOccupiedTomorrow.map(async (consultingRooms) => {
                    return strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').update({
                        where: {
                            id: consultingRooms.id
                        },  
                        data : 
                         { notifyCustomer: true }
                    });
                }));
            }
        },
        options : {
            //rule : '*/15 * * * * *', //=> 15s
            tz: 'America/Montreal'
        }

    },

    automaticallySwitchAvailableStatusConsultingRooms : {
        task: async function ({strapi}){
            const thisMoment = new Date();

            const consutingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    until : {
                        $lte: thisMoment  
                    }
                },
                populate: {
                    consultation: true,
                },
            });


            await Promise.all(consutingRooms.map(consutingRoom=>{
                return strapi.db.query('api::consulting-room-history.consulting-room-history').update({  
                    where : {
                        consultingRoomHistoryId : consutingRoom.consultation.id,
                        status: {
                        $eqi : 'Occupied'
                        },
                    },
                    data : 
                     { status: 'available' }
                });
            }));

        },
        options : {
            //rule : '*/10 * * * * *',
            tz: 'America/Montreal'
        }
    },

    automaticallySwitchOcuppiedStatusConsultingRooms : {
        task: async function ({strapi}){

            const thisMoment = new Date();

            const consutingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    since : {
                        $lt: thisMoment
                    },
                    until : {
                        $gt: thisMoment  
                    }
                },
                populate: {
                    consultation: true,
                },
            });


            await Promise.all(consutingRooms.map(consutingRoom=>{
                return strapi.db.query('api::consulting-room-history.consulting-room-history').update({  
                    where : {
                        consultingRoomHistoryId : consutingRoom.consultation.id,
                        status: {
                        $eqi : 'available'
                        },
                    },
                    data : 
                     { status: 'occupied' }
                })
            }))

        },
        options : {
            //rule : '*/10 * * * * *', 
            tz: 'America/Montreal'
        }
    },
 
    automaticallySwitchOccupiedStatusEquitment : {
        task: async function ({strapi}){

            const thisMoment = new Date();

            const consultations = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    since : {
                        $lte: thisMoment
                    },
                    until : {
                        $gte: thisMoment  
                    }
                },
                populate: {
                    consultation: true,
                }
            });

            console.log("consultations =>");
            console.log(consultations);

            if(consultations.length > 0) {

                const treatments = await Promise.all(consultations.map(consultation=>{
                    return strapi.db.query('api::consultation.consultation').findMany({  
                        where : {
                            id : consultation.consultation.id,
                        },
                        populate: {
                            treatments: true,
                        }
                    });
                }));
    
            console.log("---------------------------------------------------");
            console.log("treatments =>");
            console.log(treatments[0][0].treatments);

            if(treatments.length > 0) {

                const equitments = await Promise.all(treatments[0][0].treatments.map(treatment=>{
                    return strapi.db.query('api::treatment.treatment').findMany({  
                        where : {
                            id : treatment.treatmentId,
                        },
                        populate: {
                            equipments: true,
                        }
                    });
                }));

                console.log("---------------------------------------------------");
                console.log("equitments =>");
                console.log(equitments[0][0].equipments);

                if (equitments.length > 0) {
                    await Promise.all(equitments[0][0].equipments.map(equipment=>{
                        return strapi.db.query('api::equipment-history.equipment-history').update({  
                            where : {
                                id : equipment.equipmentId,
                                since : {
                                    $lte: thisMoment
                                },
                                until : {
                                    $gte: thisMoment  
                                },
                                // si esta rentado o roto no estaria disponible para una consulta
                                status: {
                                    $eq : 'available'
                                }
                            },
                            data : { status: 'occupied' }
                        });
                    }));                    
                }
            }
        }

            
        },
        options : {

            //rule : '*/10 * * * * *', //2 horas
            tz: 'America/Montreal'
        }
    },

    automaticallySwitchAvailableStatusEquitment : {
        task: async function ({strapi}){

            const thisMoment = new Date();

            const consultations = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    until : {
                        $lte: thisMoment  
                    }
                },
                populate: {
                    consultation: true,
                }
            });

            console.log("consultations =>");
            console.log(consultations);

            if(consultations.length > 0) {

                const treatments = await Promise.all(consultations.map(consultation=>{
                    return strapi.db.query('api::consultation.consultation').findMany({  
                        where : {
                            id : consultation.consultation.id,
                        },
                        populate: {
                            treatments: true,
                        }
                    });
                }));
    
            console.log("---------------------------------------------------");
            console.log("treatments =>");
            console.log(treatments[0][0].treatments);

            if(treatments.length > 0) {

                const equitments = await Promise.all(treatments[0][0].treatments.map(treatment=>{
                    return strapi.db.query('api::treatment.treatment').findMany({  
                        where : {
                            id : treatment.treatmentId,
                        },
                        populate: {
                            equipments: true,
                        }
                    });
                }));

                console.log("---------------------------------------------------");
                console.log("equitments =>");
                console.log(equitments[0][0].equipments);

                if (equitments.length > 0) {
                    await Promise.all(equitments[0][0].equipments.map(equipment=>{
                        return strapi.db.query('api::equipment-history.equipment-history').update({  
                            where : {
                                id : equipment.equipmentId,
                                until : {
                                    $lte: thisMoment  
                                },
                                // si esta rentado o roto no estaria disponible para una consulta
                                status: {
                                    $eq : 'occupied'
                                }
                            },
                            data : { status: 'available' }
                        });
                    }));                    
                }
            }
        }

            
        },
        options : {
            //'*10 * * * * *' => 10s
            //rule : '*/10 * * * * *',
            tz: 'America/Montreal'
        }
    },

    
    automaticallySwitchStatusEquitmentIsRentedOrBroken : {
        task: async function ({strapi}){

            const thisMoment = new Date();

            const equitmentsToSwichState = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                where: {
                    until: { $lte: thisMoment },
                    $or: [
                        { status: 'rented' },
                        { status: 'broken' },
                    ]
                },
            });
            

            console.log("equitmentsToSwichState =>");
            console.log(equitmentsToSwichState);

            if(equitmentsToSwichState.length > 0) {

                await Promise.all(equitmentsToSwichState.map(equipment=>{
                    return strapi.db.query('api::equipment-history.equipment-history').update({  
                        where : {
                            id : equipment.equipmentHistoryId,
                        },
                        data : { status: 'available' }
                    });
                }));
        }

            
        },
        options : {
            //'*/10 * * * * *' => 10s
            //rule : '*/10 * * * * *', //2 horas
            tz: 'America/Montreal'
        }
    }

}
