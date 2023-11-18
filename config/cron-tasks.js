
module.exports = {
            
    notifyCustomers : {
        //Maldito TypeScript

        task: async function ({strapi}){
            /*
            const tomorrowStart = new Date();
            tomorrowStart.setDate(tomorrowStart.getDate() + 1); // Agregar un día
            tomorrowStart.setHours(0, 0, 0, 0); // Establecer la hora a 00:00:00

            const tomorrowEnd = new Date();
            tomorrowEnd.setDate(tomorrowEnd.getDate() + 1); 
            tomorrowEnd.setHours(23, 59, 59, 999); 
            */

            const consultingRoomsOccupiedTomorrow = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    id : 1
                    /*
                    since : {
                        $gte: tomorrowStart,
                        $lte: tomorrowEnd  
                    }
                    */
                },
                populate: {
                  consultation: true,
                },
            });

            //console.log(consultingRoomsOccupiedTomorrow);

            const hour = consultingRoomsOccupiedTomorrow[0].since;

            const customer = await Promise.all(consultingRoomsOccupiedTomorrow
                .map(consultingRooms =>{
                return strapi.db.query('api::consultation.consultation').findOne({
                    where : {
                        id : consultingRooms.id,
                    },
                    populate: {
                        customer: true,
                    },
                })
            }));

            
            /*
            customer.map(notify => {
                const name = notify.customer.name;
                const lastname = notify.customer.lastname;
                const cellphone = notify.customer.cellphone;
    
                const message = `Hola ${name} ${lastname}, te recordamos que el dia de mañana a la hora ${hour} tienes consulta en nuestra clinica. Favor de confirmar`;
    
                //Funcion de enviar WhatsAPP con el numero y mensaje
            });
            */

            const name = customer[0].customer.name;
            const lastname = customer[0].customer.lastname;
            const cellphone = customer[0].customer.cellphone;

            const message = `Hola ${name} ${lastname}, te recordamos que el dia de mañana a la hora ${hour} tienes consulta en nuestra clinica. Favor de confirmar`;

            //Funcion de enviar WhatsAPP con el numero y mensaje

            //console.log(customer[0].customer.cellphone);
            //console.log(message);


        },
        options : {
            rule : '*/10 * * * * *',
            tz: 'America/Montreal'
        }

    },
    notifyCollaborators : {

        task: async function ({strapi}){



            /*
            const thisMoment = new Date();

            const fifteenMinutesBefore = new Date();
            fifteenMinutesBefore.setMinutes(fifteenMinutesBefore.getMinutes() + 15);
            */

            const consultingRoomsOccupiedfifteenMinutesBefore = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                where : {
                    id : 1
                    /*
                    since : {
                        $gte: thisMoment,
                        $lte: fifteenMinutesBefore  
                    }
                    */
                },
                populate: {
                    consultation: true,
                },
            });
        
           // console.log(consultingRoomsOccupiedfifteenMinutesBefore);

            const hour = consultingRoomsOccupiedfifteenMinutesBefore[0].since;

            const collaborators = await Promise.all(consultingRoomsOccupiedfifteenMinutesBefore
                .map(collaborator =>{
                return strapi.db.query('api::consultation.consultation').findOne({
                    where : {
                        id : collaborator.id,
                    },
                    populate: {
                        responsibleUser: true,
                        customer: true,
                    }
                })
            }));

            console.log(collaborators[0].responsibleUser.cellphone);
            console.log(collaborators[0].customer);

            const customerName = collaborators[0].customer.name;
            const customerLastame = collaborators[0].customer.lastname;
            const customerCellphone = collaborators[0].customer.cellphone;
            const customerProfession = collaborators[0].customer.profession;
            const customerAddress = collaborators[0].customer.address;

            const message = `Hola ${customerName}, te recuerdo que en 15 minutos aproximadamente, a la hora ${hour}, tienes consulta con ${customerName} ${customerLastame}; el ${customerProfession} de ${customerAddress}. Cualquier inconveniente avisale a ${customerCellphone}.`;
            
            console.log(message);

                        /*
            collaborators.map(notify => {
            const customerName = notify.customer.name;
            const customerLastame = notify.customer.lastname;
            const customerCellphone = notify.customer.cellphone;
            const customerProfession = notify.customer.profession;
            const customerAddress = notify.customer.address;
    
                const message = `Hola ${customerName}, te recuerdo que en 15 minutos aproximadamente, a la hora ${hour}, tienes consulta con ${customerName} ${customerLastame}; el ${customerProfession} de ${customerAddress}. Cualquier inconveniente avisale a ${customerCellphone}.`;
    
                //Funcion de enviar WhatsAPP con el numero y mensaje
            });
            */

        },
        options : {
            rule : '*/10 * * * * *',
            tz: 'America/Montreal'
        }
    }

}