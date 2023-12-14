const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendCodeWhatsApp } = require('./sendCodeWhatsapp');

module.exports = (plugin) => {

  plugin.controllers.user.sendCode = async (ctx) => {

            if ( ctx.request.body.username || ctx.request.body.email ) {
                await strapi.query('plugin::users-permissions.user').findOne({
                    where: {
                        $or: [
                        {
                            username: { $eqi : ctx.request.body.username },
                        },
                        {
                            email: { $eqi : ctx.request.body.email },
                        },
                        ],
                    },
                }).then( async (res)=>{

                    if ( res.confirmed && !res.blocked ) {

                        const userId = res.id;

                        await strapi.db.query('api::user-data.user-data').findOne({
                            where : {
                                id : res.id,
                            }
                        }).then( async (res) =>{

                            let code
                            let sameCode


                            do {
                                const randomBytes = crypto.randomBytes(3);
                                console.log(randomBytes);
                                code = randomBytes.toString('hex').slice(0, 6);
                                console.log(code);


                                sameCode = await strapi.db.query('api::recovery-code.recovery-code').findOne({
                                    where : {
                                        code : code,
                                    }
                                });
                            } while (sameCode)

                            const validSince = new Date().getTime();
                            const validUntil = validSince + 90000;

                            const number = res.cellphone;
                            

                            const infoCode = {
                                Code : code,
                                //La tabla tiene una relacion 0 a 1 users_data
                                user_id : res.id,
                                validSince : validSince,
                                validUntil : validUntil,
                            }


                            await strapi.db.query('api::recovery-code.recovery-code').create({data : infoCode})
                            .then( async (res)=>{
                                try {
                                    console.log(code);
                                    console.log(infoCode.Code);

                                    await sendCodeWhatsApp(code, number);

                                    const jwtToken = strapi.plugins['users-permissions'].services.jwt.issue({
                                        id: res.id
                                    });

                                    ctx.response.status = 200;
                                    ctx.response.body = {
                                        jwtToken,
                                        message: `Operacion ejecutada correctamente`,
                                        userId : userId,
                                    };
                                } catch (error) {
                                    console.log(error);
                                    ctx.response.status = 405;
                                    ctx.body = {
                                        message: `No se pudo enviar el código por WhatsApp`,
                                    };
                                }
                            }).catch((error)=>{
                                console.log(error);
                                ctx.response.status = 405;
                                ctx.body = {
                                    message: `No se pudo crear registro de recuperacion de contraseña`,
                                };
                            });


                        }).catch((error) =>{
                            console.log(error);
                            ctx.response.status = 405;
                            ctx.body = {
                                message: `No se encontro un número de telefono asociado a este usuario`,
                            };
                        })
                    } else {
                        ctx.response.status = 405;
                        ctx.response.body = {
                            message: `Usuario bloquedo o sin confirmar`,
                        };
                    }

                }).catch ((error)=>{
                    console.log(error);
                    ctx.response.status = 405;
                    ctx.body = {
                        message: `Usuario incorrecto`,
                    };
                });

    } else {
        ctx.response.status = 405;
        ctx.body = {
        message: `Se requiere un numero, username, o email`
        };
    }
}



plugin.controllers.user.changePasswordByWhatsapp = async (ctx) => {

    console.log(ctx.request.body);
    if ( ctx.request.body && ctx.request.body.code && ctx.request.body.newPassword && ctx.request.body.id ){
        await strapi.db.query('api::recovery-code.recovery-code').findOne({
            where: { code: ctx.request.body.code }
        }).then( async (res)=>{

            const moment = new Date();
            const validSince = new Date(res.validSince);
            const validUntil = new Date(res.validUntil);

            if(moment > validSince && moment < validUntil){

                const password = bcrypt.hashSync(ctx.request.body.newPassword , 10);

                await strapi.query('plugin::users-permissions.user').update({
                    where: { id: ctx.request.body.id },
                    data: { password },
                }).then((res)=>{       
                    ctx.response.status = 201;
                    ctx.response.body = ({
                        user: res,
                    });
    
                }).catch ((error)=>{
                    console.log(error);
                    ctx.response.status = 405;
                    ctx.body = {
                        message: `No se pudo actualizar al Usuario`,
                    };
                });
            } else {
                ctx.response.status = 405;
                ctx.body = {
                    message: `Su código ha expirado, vuelva a solicitar otro`,
                };
            }




        }).catch((error)=>{
            ctx.response.status = 405;
            ctx.body = {
            message: `código incorrecto`
            };
        })
    } else {
        ctx.response.status = 400;
        ctx.body = {
        message: `Solicitud mal formulada`
        };
    }
}


//---------------------------------------------------------------------------------------------------

console.log(plugin.controllers);

plugin.controllers.user.botCreate = async (ctx) => {
    try {
        console.log(ctx.request.body);

        if ( ctx.request.body && 
             ctx.request.body.userNumber && 
             ctx.request.body.customerName && 
             ctx.request.body.customerLastname && 
             ctx.request.body.dateSince && 
             ctx.request.body.dateUntil && 
             ctx.request.body.treatments && 
             ctx.request.body.consultingRoomName
        ) {

            const dateSince = new Date(ctx.request.body.dateSince);
            const dateUntil = new Date(ctx.request.body.dateUntil);

            // SI LAS FECHAS NO VIENEN EN EL FORMATO DATE TIME ('AAAA-MM-DDTHH:MM:SS'), Y LA DECHA HASTA NO ES MAYOR A DESDE NO PASA
            if (!isNaN(dateSince.getTime()) && !isNaN(dateUntil.getTime()) && ((dateUntil.getTime()) > (dateSince.getTime()))){

                const customer = await strapi.db.query('api::customer-personal-information.customer-personal-information').findOne({
                    where: { 
                        name: ctx.request.body.customerName,
                        lastname: ctx.request.body.customerLastname
                    }
                });
                console.log("----------------------------------------------");
                console.log("customer =>");
                console.log(customer);

                
                if(customer){
                    
                    const responsibleUser = await strapi.db.query('api::user-data.user-data').findOne({
                        where: { 
                            cellphone: ctx.request.body.userNumber,
                        }
                    });

                    console.log("----------------------------------------------");
                    console.log("responsibleUser =>");
                    console.log(responsibleUser);

                    
                    if(responsibleUser){

                        //puede ser un array => recorrerlo con un map
                        //ctx.request.body.treatments => ["tratamineto1" , "tratamineto2"]
                        console.log(ctx.request.body.treatments);
                        const treatments = await Promise.all(ctx.request.body.treatments.map(async treatmentName => {
                            console.log(treatmentName);
                            const treatment = await strapi.db.query('api::treatment.treatment').findOne({
                                where: { 
                                    name: treatmentName,
                                },
                                populate: {
                                    equipments: true,
                                }
                            });

                            if (!treatment) {
                                // Tratamiento no encontrado, manejar este caso según tus necesidades
                                console.log(`Tratamiento no encontrado: ${treatmentName}`);
                            }
                    
                            return treatment;
                        }));

                        console.log("----------------------------------------------");
                        console.log("treatments =>");
                        console.log(treatments);
                        console.log(treatments.length> 0);
                        console.log(!treatments.includes(null));
 
                        
                        if(treatments.length> 0 && !treatments.includes(null)){

                            const consultingRoom = await strapi.db.query('api::consulting-room.consulting-room').findOne({
                                where: { 
                                    name: ctx.request.body.consultingRoomName,
                                }
                            });

                            console.log("----------------------------------------------");
                            console.log("consultingRoom =>");
                            console.log(consultingRoom);

                            
                            if(consultingRoom) {


                                //Podria encontrar un registro en este historial cuya consulta asociada haya sido cancelada, si fue cancelada el registro de este historial todavia estaria disponible pero si podria agendar otra consulta a esa hora
                                const notAvailableConsultationConsultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                                    where: { 
                                        since: { $gte : dateSince},
                                        until: { $lte : dateUntil},
                                    },
                                    populate: {
                                        consultingRoom: true,
                                        consultation: true
                                    }
                                });

                                //Si el consultingRoom que viene en notAvailableConsultationConsultingRoom quiere decir que el consultorio en que se quiere crear la consulta ya esta ocupado
                                const consultingRoomOccupied = await Promise.all(notAvailableConsultationConsultingRooms.map(async (notAvailableConsultationConsultingRoom) => {
                                    // de entre todas la consultas (recorridas en el map) a esa hora pregunto si esa consulta no esta cancelada, eso quiere decir que hay una consulta valida a esa hora
                                    const cosultation = await strapi.db.query('api::consultation.consultation').findOne({
                                        where: { 
                                            id: { $eq : notAvailableConsultationConsultingRoom.consultation.id},
                                            status: { $ne : 'cancel'},
                                        },
                                    })

                                    console.log(cosultation);
                                    console.log(notAvailableConsultationConsultingRoom.consultingRoom.id === consultingRoom.id);


                                    //Si hay una consulta valida, esas fechas, y el consultorio en el que se quiere registrar ya esta ocupado retorno true
                                   if (cosultation && notAvailableConsultationConsultingRoom.consultingRoom.id === consultingRoom.id){
                                        return true;
                                   } 
                                   return false;
                                }));


                                console.log("----------------------------------------------");
                                console.log("notAvailableConsultationConsultingRooms =>");
                                console.log(notAvailableConsultationConsultingRooms);

                                console.log(!consultingRoomOccupied.includes(true));
              
                                //Si se encontro una consulta valida esas fechas en ese consultorio entonces no tiene que pasar este if
                                if(!consultingRoomOccupied.includes(true)){


                                    const notAvailableConsultingRooms = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                        where: { 
                                            since: { $gte : dateSince},
                                            until: { $lte : dateUntil},
                                            // $ne => Not Equal, es decir me traera los consultorios que no estan disponibles 
                                            status: { $ne : 'available' },
                                            consulting_room: consultingRoom.id
                                        }
                                    });

                                    console.log("----------------------------------------------");
                                    console.log("notAvailableConsultingRooms =>");
                                    console.log(notAvailableConsultingRooms);

                                    //Quiero que el array venga vacio, que significa que el consultorio esta disponible
                                    if(notAvailableConsultingRooms === null) {
                                        //Aqui podria fallar porque treatments puede ser un array con varios tratamientos que a su vez tiene aotro array en equipments
                                        const notAvailableEquitments = await Promise.all(treatments.map(async treatment => {
                                            console.log("treatment.equipments =>" + treatment.equipments);
                                            const equipments = treatment.equipments;
                                        
                                            const equipmentPromises = equipments.map(async equipment => {
                                                console.log("equipment =>" + equipment);
                                                const historyEquipment = await strapi.db.query('api::equipment-history.equipment-history').findOne({
                                                    where: { 
                                                        since: { $gte : dateSince},
                                                        until: { $lte : dateUntil},
                                                        equipment: equipment.id,
                                                        status: { $ne : 'available' },
                                                    }
                                                });
                                                console.log("historyEquipment =>" + historyEquipment);
                                                return historyEquipment;
                                            });
                                        
                                            // Espera a que todas las promesas internas se resuelvan antes de pasar al siguiente tratamiento
                                            return Promise.all(equipmentPromises);
                                        }));

                                        console.log("----------------------------------------------");
                                        console.log("notAvailableEquitment =>");
                                        console.log(notAvailableEquitments);
                                        
                                        //Si cada elemento del array vine null, quiere decir que los equipos estan disponibles"
                                        if (notAvailableEquitments.every(equipmentArray => equipmentArray.every(historyEquipment => historyEquipment === null))) {

                                            //Verificado todo puedo comanzar a crear
                                            try {
                                                const newConsultation = await strapi.db.query('api::consultation.consultation').create({
                                                    data: {
                                                      customer: customer.id,
                                                      treatments: treatments.map(treatment => treatment.id),
                                                      extraConsultingRoom: false,
                                                      responsibleUser: responsibleUser.id,
                                                      comments: "",
                                                      status: 'pending'
                                                    },
                                                  });

                                                  if(newConsultation){
                                                    
                                                        const consultationConsultingRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').create({
                                                            data: {
                                                            consultation: newConsultation.id,
                                                            consultingRoom: consultingRoom.id,
                                                            since: dateSince,
                                                            until: dateUntil,
                                                            notifyCustomer: false,
                                                            notifyUser: false
                                                            },
                                                        });
                                                        console.log(consultationConsultingRoom);
                                                        
                                                        if(consultationConsultingRoom) {
                                                            const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').create({
                                                                data: {
                                                                //consultingRoomHistoryId: x, ???
                                                                consulting_room: consultingRoom.id,
                                                                status:  'occupied',
                                                                since: dateSince,
                                                                until: dateUntil,
                                                                },
                                                            });

                                                            if(consultingRoomHistory) {

                                                                const equipmentHistoryPromises = [];
    
                                                                // Recorre cada tratamiento en el array
                                                                treatments.forEach(treatment => {
                                                                    // Verifica si el tratamiento tiene equipos
                                                                    if (treatment.equipments && treatment.equipments.length > 0) {
                                                                    // Recorre cada equipo en el tratamiento
                                                                    treatment.equipments.forEach(async equipment => {
                                                                        // Crea un registro en equipment-history para cada equipo
                                                                        const equipmentHistoryPromise = strapi.db.query('api::equipment-history.equipment-history').create({
                                                                        data: {
                                                                            //equipmentHistoryId: id, ???
                                                                            equipment: equipment.id,
                                                                            status: 'occupied',
                                                                            since: dateSince,
                                                                            until: dateUntil,
                                                                        },
                                                                        });
                                                                
                                                                        // Agrega la promesa al array de promesas
                                                                        equipmentHistoryPromises.push(equipmentHistoryPromise);
                                                                    });
                                                                    }
                                                                });
                                                                
                                                                // Espera a que se completen todas las promesas antes de continuar
                                                                const equipmentHistories = await Promise.all(equipmentHistoryPromises);
        
                                                                if(equipmentHistories && equipmentHistories.length > 0) {
                                                                    ctx.response.status = 200;
                                                                    ctx.response.body = {
                                                                        message : "Consulta creada con exito",
                                                                        newConsultation: newConsultation
                                                                    }
                                                                } else {
                                                                // enviar respuesta negativa
                                                                    ctx.response.status = 500;
                                                                    ctx.response.body = {
                                                                        message : "No se pudo registrar en el history-equitment",
                                                                    }
                                                                }
                                                            } else {                                                                             //borrar consulta
                                                                // enviar respuesta negativa
                                                                ctx.response.status = 500;
                                                                ctx.response.body = {
                                                                    message : "No se pudo registrar en el history-consulting-room",
                                                                }
                                                            }
                                                        } else {
                                                            //borrar consulta
                                                            //enviar respuesta negativa
                                                            ctx.response.status = 500;
                                                            ctx.response.body = {
                                                                message : "No se pudo registrar en el consultation-consulting-room",
                                                            }
                                                        }
                
                                                  } else {
                                                    //enviar respuesta negativa
                                                    ctx.response.status = 500;
                                                    ctx.response.body = {
                                                        message : "No se pudo crear la consulta",
                                                    }
                                                  }
                                                       
                                               
                                            } catch (error) {
                                                ctx.response.status = 500;
                                                ctx.response.body = {
                                                    message : "Error interno al crear los registros",
                                                    error: error
                                                }

                                                //ELIMINACIONES DE EMERGENCIA?
                                                //NO HAY ROLLBACK
                                                                                                                    /*
                                                                    await strapi.db.query('api::consultation.consultation').delete({
                                                                        where: { id: newConsultation.id },
                                                                    });

                                                                    await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').delete({
                                                                        where: { id: consultationConsultingRoom.id },
                                                                    });

                                                                    await strapi.db.query('api::consulting-room-history.consulting-room-history').delete({
                                                                        where: { id: consultingRoomHistory.id },
                                                                    });

                                                                    await strapi.db.query('api::consulting-room-history.consulting-room-history').delete({
                                                                        where: { id: equipmentHistories.id },
                                                                    });
                                                                    */
                                            }
                                        }
                                        else {
                                            ctx.response.status = 405;
                                            ctx.response.body = {
                                                message : "Los equipos no estan disponibles"
                                            }
                                        }
    
                                    }
                                    else {
                                        ctx.response.status = 405;
                                        ctx.response.body = {
                                            message : "El consultorio no esta disponible"
                                        }
                                    }
                                    
                                }
                                else {
                                    ctx.response.status = 405;
                                    ctx.response.body = {
                                        message : "El consultorio ya posee una reserva a esa hora"
                                    }
                                }
                                
                            }
                            else {
                                ctx.response.status = 405;
                                ctx.response.body = {
                                    message : "No se pudo identificar al consultorio que quiere"
                                }
                            }
                            
                        }
                        
                        else {
                            ctx.response.status = 405;
                            ctx.response.body = {
                                message : "No se pudo agregar o encontrar los tratamientos mencionados para esta consulta"
                            }
                        }
                    }
                    else {
                        ctx.response.status = 405;
                        ctx.response.body = {
                            message : "No se pudo identificar al responsable para esta consulta"
                        }
                    }
                    
                }
                
                else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message : "No se pudo identificar al cliente"
                    }
                }
                

            }
            else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message : "Las fechas indicadas no estan en el formato correcto"
                }
            }
        }
        else {
            ctx.response.status = 405;
            ctx.response.body = {
                message : "Faltan datos para poder crear una consulta"
            }
        }
        
    } catch (error) {
        ctx.response.status = 405;
        ctx.response.body = error;
    }
}


plugin.controllers.user.simlpleCreateConsultation = async (ctx) => {
    try {
        if ( ctx.request.body &&
            ctx.request.body.responsibleUserId &&
            ctx.request.body.customerId &&
            ctx.request.body.dateSince &&
            ctx.request.body.dateUntil &&
            ctx.request.body.treatments &&
            ctx.request.body.treatments.length > 0 &&
            ctx.request.body.consultingRoomId
       ) { 

        const dateSince = new Date(ctx.request.body.dateSince);
        const dateUntil = new Date(ctx.request.body.dateUntil);

        // SI LAS FECHAS NO VIENEN EN EL FORMATO DATE TIME ('AAAA-MM-DDTHH:MM:SS'), Y LA DECHA HASTA NO ES MAYOR A DESDE NO PASA
        if (!isNaN(dateSince.getTime()) && !isNaN(dateUntil.getTime()) && ((dateUntil.getTime()) > (dateSince.getTime()))){ 


            try {


                const treatments = await Promise.all(ctx.request.body.treatments.map(async treatmentId => {
                    console.log(treatmentId);
                    const treatment = await strapi.db.query('api::treatment.treatment').findOne({
                        where: {
                            id: treatmentId,
                        },
                        populate: {
                            equipments: true,
                        }
                    });


                    if (!treatment) {
                        // Tratamiento no encontrado, manejar este caso según tus necesidades
                        console.log(`Tratamiento no encontrado: ${treatment}`);
                    }
           
                    return treatment;
                }));


                console.log("----------------------------------------------");
                console.log("treatments =>");
                console.log(treatments);
                console.log(treatments.length> 0);
                console.log(!treatments.includes(null));

               
                if(treatments.length> 0 && !treatments.includes(null)){
                    const newConsultation = await strapi.db.query('api::consultation.consultation').create({
                        data: {
                          customer: ctx.request.body.customerId,
                          treatments: ctx.request.body.treatments.map(treatment => treatment.id),
                          extraConsultingRoom:  ctx.request.body.extraConsultingRoomId ? ctx.request.body.extraConsultingRoomId : null,
                          responsibleUser: ctx.request.body.responsibleUserId,
                          comments: ctx.request.body.comments ? ctx.request.body.comments : null,
                          status: 'pending'
                        },
                      });
    
                      const consultationConsultingRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').create({
                        data: {
                        consultation: newConsultation.id,
                        consultingRoom: ctx.request.body.consultingRoomId,
                        since: dateSince,
                        until: dateUntil,
                        notifyCustomer: false,
                        notifyUser: false
                        },
                    });
    
                    const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').create({
                        data: {
                        //consultingRoomHistoryId: x, ???
                        consulting_room: ctx.request.body.consultingRoomId,
                        status:  'occupied',
                        since: dateSince,
                        until: dateUntil,
                        },
                    });
    
                    const equipmentHistoryPromises = [];
        
                    // Recorre cada tratamiento en el array
                    treatments.forEach(treatment => {
                        // Verifica si el tratamiento tiene equipos
                        if (treatment.equipments && treatment.equipments.length > 0) {
                        // Recorre cada equipo en el tratamiento
                        treatment.equipments.forEach(async equipment => {
                            // Crea un registro en equipment-history para cada equipo
                            const equipmentHistoryPromise = strapi.db.query('api::equipment-history.equipment-history').create({
                            data: {
                                //equipmentHistoryId: id, ???
                                equipment: equipment.id,
                                status: 'occupied',
                                since: dateSince,
                                until: dateUntil,
                            },
                            });
                    
                            // Agrega la promesa al array de promesas
                            equipmentHistoryPromises.push(equipmentHistoryPromise);
                        });
                        }
                    });
                    
                    // Espera a que se completen todas las promesas antes de continuar
                    const equipmentHistories = await Promise.all(equipmentHistoryPromises);

                    if(newConsultation && consultationConsultingRoom && consultingRoomHistory && equipmentHistories && equipmentHistories.length > 0) {
                        ctx.response.status = 200;
                        ctx.response.body = {
                            message : "Consulta creada con exito",
                            newConsultation: newConsultation
                        }
                    } else {   
                    //borrar consulta
                    //borrar consultationConsultingRoom
                    //borrar consultingRoomHistory
                    // borrar equipmentHistories
                    // enviar respuesta negativa
                    }
                }

            } catch (error) {
                ctx.response.status = 405;
                ctx.response.body = {
                    message : "Error al crear los registros",
                    error: error
                }
            }




        } else {
            ctx.response.status = 405;
            ctx.response.body = {
                message : "La fechas no estan en el formato correcto"
            }
        }

       } else {
            ctx.response.status = 405;
            ctx.response.body = {
                message : "No se cuenta con todos los datos nesesarios para crear una consulta"
            }
       }
    } catch (error) {
        ctx.response.status = 405;
        ctx.response.body = {
            message : "Error inicial al procesar la creacion de consulta",
            error : error
        }
    }
}

  

    plugin.routes['content-api'].routes.push(
      {
        method: 'POST',
        path: '/user/sendCode',
        handler: 'user.sendCode',
        config: {
          prefix: '',
          policies: []
        }
      },
      {
        method: "PUT",
        path: "/user/changePasswordByWhatsapp",
        handler: "user.changePasswordByWhatsapp",
        config: {
          prefix: "",
          policies: []
        },
      },
      {
        method: "POST",
        path: "/consultation/botCreate",
        handler: "user.botCreate",
        config: {
          prefix: "",
          policies: []
        },
      },
      {
        method: "POST",
        path: "/consultation/simlpleCreateConsultation",
        handler: "user.simlpleCreateConsultation",
        config: {
          prefix: "",
          policies: []
        },
      }
    )

    return plugin
}


//Primero creas consulta => creas el consulting-consiltin-room(que tiene desde y hasta + id consulta => trataminetos => equipos + idConsultorio )

/*
plugin.controllers.user.botCreate = async (ctx) => {
    try {
        console.log(ctx.request.body);


        if ( ctx.request.body &&
             ctx.request.body.userNumber &&
             ctx.request.body.customerName &&
             ctx.request.body.customerLastname &&
             ctx.request.body.dateSince &&
             ctx.request.body.dateUntil &&
             ctx.request.body.treatments &&
             ctx.request.body.consultingRoomName
        ) {


            const dateSince = new Date(ctx.request.body.dateSince);
            const dateUntil = new Date(ctx.request.body.dateUntil);


            // SI LAS FECHAS NO VIENEN EN EL FORMATO DATE TIME ('AAAA-MM-DDTHH:MM:SS'), Y LA DECHA HASTA NO ES MAYOR A DESDE NO PASA
            if (!isNaN(dateSince.getTime()) && !isNaN(dateUntil.getTime()) && ((dateUntil.getTime()) > (dateSince.getTime()))){


                const customer = await strapi.db.query('api::customer-personal-information.customer-personal-information').findOne({
                    where: {
                        name: ctx.request.body.customerName,
                        lastname: ctx.request.body.customerLastname
                    }
                });
                console.log("----------------------------------------------");
                console.log("customer =>");
                console.log(customer);


               
                if(customer){
                   
                    const responsibleUser = await strapi.db.query('api::user-data.user-data').findOne({
                        where: {
                            cellphone: ctx.request.body.userNumber,
                        }
                    });


                    console.log("----------------------------------------------");
                    console.log("responsibleUser =>");
                    console.log(responsibleUser);


                   
                    if(responsibleUser){


                        //puede ser un array => recorrerlo con un map
                        //ctx.request.body.treatments => ["tratamineto1" , "tratamineto2"]
                        console.log(ctx.request.body.treatments);
                        const treatments = await Promise.all(ctx.request.body.treatments.map(async treatmentName => {
                            console.log(treatmentName);
                            const treatment = await strapi.db.query('api::treatment.treatment').findOne({
                                where: {
                                    name: treatmentName,
                                },
                                populate: {
                                    equipments: true,
                                }
                            });


                            if (!treatment) {
                                // Tratamiento no encontrado, manejar este caso según tus necesidades
                                console.log(Tratamiento no encontrado: ${treatmentName});
                            }
                   
                            return treatment;
                        }));


                        console.log("----------------------------------------------");
                        console.log("treatments =>");
                        console.log(treatments);
                        console.log(treatments.length> 0);
                        console.log(!treatments.includes(null));
 
                       
                        if(treatments.length> 0 && !treatments.includes(null)){


                            const consultingRoom = await strapi.db.query('api::consulting-room.consulting-room').findOne({
                                where: {
                                    name: ctx.request.body.consultingRoomName,
                                }
                            });


                            console.log("----------------------------------------------");
                            console.log("consultingRoom =>");
                            console.log(consultingRoom);


                           
                            if(consultingRoom) {




                                //Podria encontrar un registro en este historial cuya consulta asociada haya sido cancelada, si fue cancelada el registro de este historial todavia estaria disponible pero si podria agendar otra consulta a esa hora
                                const notAvailableConsultationConsultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                                    where: {
                                        since: { $gte : dateSince},
                                        until: { $lte : dateUntil},
                                    },
                                    populate: {
                                        consultingRoom: true,
                                        consultation: true
                                    }
                                });


                                //Si el consultingRoom que viene en notAvailableConsultationConsultingRoom quiere decir que el consultorio en que se quiere crear la consulta ya esta ocupado
                                const consultingRoomOccupied = await Promise.all(notAvailableConsultationConsultingRooms.map(async (notAvailableConsultationConsultingRoom) => {
                                    // de entre todas la consultas (recorridas en el map) a esa hora pregunto si esa consulta no esta cancelada, eso quiere decir que hay una consulta valida a esa hora
                                    const cosultation = await strapi.db.query('api::consultation.consultation').findOne({
                                        where: {
                                            id: { $eq : notAvailableConsultationConsultingRoom.consultation.id},
                                            status: { $ne : 'cancel'},
                                        },
                                    })


                                    //Si hay una consulta valida, esas fechas, y el consultorio en el que se quiere registrar ya esta ocupado retorno true
                                   if (cosultation && notAvailableConsultationConsultingRoom.consultingRoom.id === consultingRoom.id){
                                        return true;
                                   }
                                   return false;
                                }));




                                console.log("----------------------------------------------");
                                console.log("notAvailableConsultationConsultingRooms =>");
                                console.log(notAvailableConsultationConsultingRooms);


                                console.log(!consultingRoomOccupied.includes(true));
             
                                //Si se encontro una consulta valida esas fechas en ese consultorio entonces no tiene que pasar este if
                                if(!consultingRoomOccupied.includes(true)){




                                    const notAvailableConsultingRooms = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                        where: {
                                            since: { $gte : dateSince},
                                            until: { $lte : dateUntil},
                                            // $ne => Not Equal, es decir me traera los consultorios que no estan disponibles
                                            status: { $ne : 'available' },
                                            consultingRoom: consultingRoom.id
                                        }
                                    });


                                    console.log("----------------------------------------------");
                                    console.log("notAvailableConsultingRooms =>");
                                    console.log(notAvailableConsultingRooms);


                                    //Quiero que el array venga vacio, que significa que el consultorio esta disponible
                                    if(notAvailableConsultingRooms.length === 0) {
                                        //Aqui podria fallar porque treatments puede ser un array con varios tratamientos que a su vez tiene aotro array en equipments
                                        const notAvailableEquitments = await Promise.all(treatments.map(async treatment => {
                                            console.log(treatment.equipments);
                                            const equipments = treatment.equipments;


                                            await Promise.all(equipments.map(async equipment => {
                                                return strapi.db.query('api::equipment-history.equipment-history').findOne({
                                                    where: {
                                                        since: { $gte : dateSince},
                                                        until: { $lte : dateUntil},
                                                        equipment: equipment.id,
                                                        status: { $ne : 'available' },
                                                    }
                                                });
                                            }));
                                        }));


                                        console.log("----------------------------------------------");
                                        console.log("notAvailableEquitment =>");
                                        console.log(notAvailableEquitments);
                                       
                                        //Si el array vine vacio, que no encontro equipos "indispuestos entonces pasa"
                                        if(notAvailableEquitments.length === 0){


                                            //para solventar las transacciones podria poner if => si crea cada objeto sigo sino borro los anteriores
                                            //crear consulta
                                            try {
                                                const newConsultation = await strapi.db.query('api::consultation.consultation').create({
                                                    data: {
                                                      customer: customer.id,
                                                      treatments: treatments.map(treatment => treatment.id),
                                                      extraConsultingRoom: false,
                                                      responsibleUser: responsibleUser.id,
                                                      comments: "",
                                                      status: 'pending'
                                                    },
                                                  });

                                                  if(newConsultation){
                                                    
                                                        const consultationConsultingRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').create({
                                                            data: {
                                                            consultation: newConsultation.id,
                                                            consultingRoom: consultingRoom.id,
                                                            since: dateSince,
                                                            until: dateUntil,
                                                            notifyCustomer: false,
                                                            notifyUser: false
                                                            },
                                                        });

                                                        if(consultationConsultingRoom) {
                                                            const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').create({
                                                                data: {
                                                                //consultingRoomHistoryId: x, ???
                                                                consulting_room: consultingRoom.id,
                                                                status:  'occupied',
                                                                since: dateSince,
                                                                until: dateUntil,
                                                                },
                                                            });

                                                            if(consultingRoomHistory) {

                                                                const equipmentHistoryPromises = [];
    
                                                                // Recorre cada tratamiento en el array
                                                                treatments.forEach(treatment => {
                                                                    // Verifica si el tratamiento tiene equipos
                                                                    if (treatment.equipments && treatment.equipments.length > 0) {
                                                                    // Recorre cada equipo en el tratamiento
                                                                    treatment.equipments.forEach(async equipment => {
                                                                        // Crea un registro en equipment-history para cada equipo
                                                                        const equipmentHistoryPromise = strapi.db.query('api::equipment-history.equipment-history').create({
                                                                        data: {
                                                                            //equipmentHistoryId: id, ???
                                                                            equipment: equipment.id,
                                                                            status: 'occupied',
                                                                            since: dateSince,
                                                                            until: dateUntil,
                                                                        },
                                                                        });
                                                                
                                                                        // Agrega la promesa al array de promesas
                                                                        equipmentHistoryPromises.push(equipmentHistoryPromise);
                                                                    });
                                                                    }
                                                                });
                                                                
                                                                // Espera a que se completen todas las promesas antes de continuar
                                                                const equipmentHistories = await Promise.all(equipmentHistoryPromises);
        
                                                                if(equipmentHistories && equipmentHistories.length > 0) {
                                                                    ctx.response.status = 200;
                                                                    ctx.response.body = {
                                                                        message : "Consulta creada con exito",
                                                                        newConsultation: newConsultation
                                                                    }
                                                                } else {
                                                                    
                                                                //borrar consulta
                                                                //borrar consultationConsultingRoom
                                                                //borrar consultingRoomHistory
                                                                // borrar equipmentHistories
                                                                // enviar respuesta negativa
                                                                }
                                                            } else {
                                                                //borrar consulta
                                                                //borrar consultationConsultingRoom
                                                                //borrar consultingRoomHistory
                                                                // enviar respuesta negativa
                                                            }
    
    
                                                        } else {
                                                            //borrar consulta
                                                            //borrar consultationConsultingRoom
                                                            //enviar respuesta negativa
                                                        }

                                                  } else {
                                                    //borrar newConsultation
                                                    //enviar respuesta negativa
                                                  }
                                                       
                                               
                                            } catch (error) {
                                                ctx.response.status = 500;
                                                ctx.response.body = {
                                                    message : "Error interno al crear los registros",
                                                    error: error
                                                }
                                            }
                                        }
                                        else {
                                            ctx.response.status = 405;
                                            ctx.response.body = {
                                                message : "Los equipos no estan disponibles"
                                            }
                                        }
   
                                    }
                                    else {
                                        ctx.response.status = 405;
                                        ctx.response.body = {
                                            message : "El consultorio no esta disponible"
                                        }
                                    }
                                   
                                }
                                else {
                                    ctx.response.status = 405;
                                    ctx.response.body = {
                                        message : "El consultorio ya posee una reserva a esa hora"
                                    }
                                }
                               
                            }
                            else {
                                ctx.response.status = 405;
                                ctx.response.body = {
                                    message : "No se pudo identificar al consultorio que quiere"
                                }
                            }
                           
                        }
                       
                        else {
                            ctx.response.status = 405;
                            ctx.response.body = {
                                message : "No se pudo agregar o encontrar los tratamientos mencionados para esta consulta"
                            }
                        }
                    }
                    else {
                        ctx.response.status = 405;
                        ctx.response.body = {
                            message : "No se pudo identificar al responsable para esta consulta"
                        }
                    }
                   
                }
               
                else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message : "No se pudo identificar al cliente"
                    }
                }
               


            }
            else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message : "Las fechas indicadas no estan en el formato correcto"
                }
            }
        }
        else {
            ctx.response.status = 405;
            ctx.response.body = {
                message : "Faltan datos para poder crear una consulta"
            }
        }
       
    } catch (error) {
        ctx.response.status = 405;
        ctx.response.body = error;
    }
}
*/

