
module.exports = {
            
    notifyCustomers : {
        //Maldito TypeScript

        task: async function ({strapi}){
            /*
            const tomorrowStart = new Date();
            tomorrowStart.setDate(tomorrow.getDate() + 1); // Agregar un día
            tomorrowStart.setHours(0, 0, 0, 0); // Establecer la hora a 00:00:00

            const tomorrowEnd = new Date();
            tomorrowEnd.setDate(tomorrow.getDate() + 1); 
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

            console.log(consultingRoomsOccupiedTomorrow);

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

            console.log(customer[0].customer.cellphone);
            console.log(message);


        },
        options : {
            rule : '*/10 * * * * *',
            tz: 'America/Montreal'
        }

    }
}