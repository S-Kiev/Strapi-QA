const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendCodeWhatsApp } = require('./sendCodeWhatsapp');

module.exports = (plugin) => {

    plugin.controllers.user.sendCode = async (ctx) => {

        if (ctx.request.body.username || ctx.request.body.email) {
            await strapi.query('plugin::users-permissions.user').findOne({
                where: {
                    $or: [
                        {
                            username: { $eqi: ctx.request.body.username },
                        },
                        {
                            email: { $eqi: ctx.request.body.email },
                        },
                    ],
                },
            }).then(async (res) => {

                if (res.confirmed && !res.blocked) {

                    const userId = res.id;

                    await strapi.db.query('api::user-data.user-data').findOne({
                        where: {
                            id: res.id,
                        }
                    }).then(async (res) => {

                        let code
                        let sameCode

                        do {
                            const randomBytes = crypto.randomBytes(3);
                            code = randomBytes.toString('hex').slice(0, 6);


                            sameCode = await strapi.db.query('api::recovery-code.recovery-code').findOne({
                                where: {
                                    code: code,
                                }
                            });
                        } while (sameCode)

                        const validSince = new Date().getTime();
                        const validUntil = validSince + 300000;

                        const number = res.cellphone;


                        const infoCode = {
                            Code: code,
                            validSince: validSince,
                            validUntil: validUntil,
                            user_datum: res.id,
                            publishedAt: new Date()
                        }


                        await strapi.db.query('api::recovery-code.recovery-code').create({ data: infoCode })
                            .then(async (res) => {
                                try {

                                    await sendCodeWhatsApp(code, number);

                                    ctx.response.status = 200;
                                    ctx.response.body = {
                                        message: `Operacion ejecutada correctamente`,
                                        userId: userId,
                                    };
                                } catch (error) {
                                    ctx.response.status = 405;
                                    ctx.body = {
                                        message: `No se pudo enviar el código por WhatsApp`,
                                        error: error.message
                                    };
                                }
                            }).catch((error) => {
                                console.log(error);
                                ctx.response.status = 405;
                                ctx.body = {
                                    message: `No se pudo crear registro de recuperacion de contraseña`,
                                    error: error.message
                                };
                            });


                    }).catch((error) => {
                        console.log(error);
                        ctx.response.status = 405;
                        ctx.body = {
                            message: `No se encontro un número de telefono asociado a este usuario`,
                            error: error.message
                        };
                    })
                } else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: `Usuario bloquedo o sin confirmar`,
                    };
                }

            }).catch((error) => {
                console.log(error);
                ctx.response.status = 405;
                ctx.body = {
                    message: `Usuario incorrecto`,
                    error: error.message
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

        if (ctx.request.body && ctx.request.body.code && ctx.request.body.newPassword && ctx.request.body.id) {
            await strapi.db.query('api::recovery-code.recovery-code').findOne({
                where: { code: ctx.request.body.code }
            }).then(async (res) => {

                const moment = new Date();
                const validSince = new Date(res.validSince);
                const validUntil = new Date(res.validUntil);

                if (moment > validSince && moment < validUntil) {

                    const password = bcrypt.hashSync(ctx.request.body.newPassword, 10);

                    await strapi.query('plugin::users-permissions.user').update({
                        where: { id: ctx.request.body.id },
                        data: { password },
                    }).then((res) => {
                        ctx.response.status = 201;
                        ctx.response.body = ({
                            user: res,
                        });

                    }).catch((error) => {
                        console.log(error);
                        ctx.response.status = 405;
                        ctx.body = {
                            message: `No se pudo actualizar al Usuario`,
                            error: error.message
                        };
                    });
                } else {
                    ctx.response.status = 405;
                    ctx.body = {
                        message: `Su código ha expirado, vuelva a solicitar otro`,
                    };
                }




            }).catch((error) => {
                ctx.response.status = 405;
                ctx.body = {
                    message: `código incorrecto`,
                    error: error.message
                };
            })
        } else {
            ctx.response.status = 400;
            ctx.body = {
                message: `Solicitud mal formulada`
            };
        }
    }

    plugin.controllers.user.botCreate = async (ctx) => {
        try {

            if (ctx.request.body &&
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
                if (!isNaN(dateSince.getTime()) && !isNaN(dateUntil.getTime()) && ((dateUntil.getTime()) > (dateSince.getTime()))) {

                    const customer = await strapi.db.query('api::customer-personal-information.customer-personal-information').findOne({
                        where: {
                            name: { $eqi: ctx.request.body.customerName },
                            lastname: { $eqi: ctx.request.body.customerLastname }
                        }
                    });


                    if (customer) {

                        const responsibleUser = await strapi.db.query('api::user-data.user-data').findOne({
                            where: {
                                cellphone: ctx.request.body.userNumber,
                            }
                        });


                        if (responsibleUser) {

                            //puede ser un array => recorrerlo con un map
                            //ctx.request.body.treatments => ["tratamineto1" , "tratamineto2"]
                            const treatments = await Promise.all(ctx.request.body.treatments.map(async treatmentName => {
                                const treatment = await strapi.db.query('api::treatment.treatment').findOne({
                                    where: {
                                        name: { $eqi: treatmentName },
                                    },
                                    populate: {
                                        equipments: true,
                                    }
                                });

                                if (!treatment) {
                                    // Tratamiento no encontrado, manejar este caso según tus necesidades
                                    console.log(`Tratamiento no encontrado: ${treatmentName}`);
                                    return null;
                                }

                                return treatment;
                            }));


                            if (treatments.length > 0 && !treatments.includes(null)) {

                                const consultingRoom = await strapi.db.query('api::consulting-room.consulting-room').findOne({
                                    where: {
                                        name: { $eqi: ctx.request.body.consultingRoomName },
                                    }
                                });



                                if (consultingRoom) {


                                    //Podria encontrar un registro en este historial cuya consulta asociada haya sido cancelada, si fue cancelada el registro de este historial todavia estaria disponible pero si podria agendar otra consulta a esa hora
                                    const notAvailableConsultationConsultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                                        where: {
                                            since: { $gte: dateSince },
                                            until: { $lte: dateUntil },
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
                                                id: { $eq: notAvailableConsultationConsultingRoom.consultation.id },
                                                status: { $ne: 'cancel' },
                                            },
                                        })


                                        //Si hay una consulta valida, esas fechas, y el consultorio en el que se quiere registrar ya esta ocupado retorno true
                                        if (cosultation && notAvailableConsultationConsultingRoom.consultingRoom.id === consultingRoom.id) {
                                            return true;
                                        }
                                        return false;
                                    }));

                                    //Si se encontro una consulta valida esas fechas en ese consultorio entonces no tiene que pasar este if
                                    if (!consultingRoomOccupied.includes(true)) {


                                        const notAvailableConsultingRooms = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                            where: {
                                                since: { $gte: dateSince },
                                                until: { $lte: dateUntil },
                                                // $ne => Not Equal, es decir me traera los consultorios que no estan disponibles 
                                                status: { $ne: 'available' },
                                                consulting_room: consultingRoom.id
                                            }
                                        });

                                        //Quiero que el array venga vacio, que significa que el consultorio esta disponible
                                        if (notAvailableConsultingRooms === null) {
                                            //Aqui podria fallar porque treatments puede ser un array con varios tratamientos que a su vez tiene aotro array en equipments
                                            const notAvailableEquitments = await Promise.all(treatments.map(async treatment => {
                                                const equipments = treatment.equipments;

                                                const equipmentPromises = equipments.map(async equipment => {
                                                    const historyEquipment = await strapi.db.query('api::equipment-history.equipment-history').findOne({
                                                        where: {
                                                            since: { $gte: dateSince },
                                                            until: { $lte: dateUntil },
                                                            equipment: equipment.id,
                                                            status: { $ne: 'available' },
                                                        }
                                                    });
                                                    return historyEquipment;
                                                });

                                                // Espera a que todas las promesas internas se resuelvan antes de pasar al siguiente tratamiento
                                                return Promise.all(equipmentPromises);
                                            }));

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
                                                            status: 'pending',
                                                            notifyCustomer: false,
                                                            notifyUser: false,
                                                            publishedAt: new Date()
                                                        },
                                                    });

                                                    if (newConsultation) {

                                                        const consultationConsultingRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').create({
                                                            data: {
                                                                consultation: newConsultation.id,
                                                                consultingRoom: consultingRoom.id,
                                                                since: dateSince,
                                                                until: dateUntil,
                                                                notifyCustomer: false,
                                                                notifyUser: false,
                                                                publishedAt: new Date()
                                                            },
                                                        });

                                                        if (consultationConsultingRoom) {
                                                            const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').create({
                                                                data: {
                                                                    consulting_room: consultingRoom.id,
                                                                    status: 'occupied',
                                                                    since: dateSince,
                                                                    until: dateUntil,
                                                                    publishedAt: new Date()
                                                                },
                                                            });

                                                            if (consultingRoomHistory) {

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
                                                                                    publishedAt: new Date()
                                                                                },
                                                                            });

                                                                            // Agrega la promesa al array de promesas
                                                                            equipmentHistoryPromises.push(equipmentHistoryPromise);
                                                                        });
                                                                    }
                                                                });

                                                                // Espera a que se completen todas las promesas antes de continuar
                                                                const equipmentHistories = await Promise.all(equipmentHistoryPromises);

                                                                if (equipmentHistories && equipmentHistories.length > 0 && consultingRoomHistory && consultationConsultingRoom && newConsultation) {
                                                                    ctx.response.status = 200;
                                                                    ctx.response.body = {
                                                                        message: "Consulta creada con exito",
                                                                        newConsultation: newConsultation
                                                                    }
                                                                } else {
                                                                    equipmentHistories.forEach(async equitment => {
                                                                        await strapi.db.query('api::equipment-history.equipment-history').delete({
                                                                            where: { id: equitment.id },
                                                                        });
                                                                    });

                                                                    await strapi.db.query('api::consulting-room-history.consulting-room-history').delete({
                                                                        where: { id: consultingRoomHistory.id },
                                                                    });

                                                                    await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').delete({
                                                                        where: { id: consultationConsultingRoom.id },
                                                                    });

                                                                    await strapi.db.query('api::consultation.consultation').delete({
                                                                        where: { id: newConsultation.id },
                                                                    });

                                                                    //borrar datos si no sale bien
                                                                    // enviar respuesta negativa
                                                                    ctx.response.status = 500;
                                                                    ctx.response.body = {
                                                                        message: "No se pudo registrar en la consulta, intentalo de nuevo",
                                                                    }
                                                                }
                                                            } else {                                                                             //borrar consulta
                                                                // enviar respuesta negativa
                                                                ctx.response.status = 500;
                                                                ctx.response.body = {
                                                                    message: "No se pudo registrar en el history-consulting-room",
                                                                }
                                                            }
                                                        } else {
                                                            //borrar consulta
                                                            //enviar respuesta negativa
                                                            ctx.response.status = 500;
                                                            ctx.response.body = {
                                                                message: "No se pudo registrar en el consultation-consulting-room",
                                                            }
                                                        }

                                                    } else {
                                                        //enviar respuesta negativa
                                                        ctx.response.status = 500;
                                                        ctx.response.body = {
                                                            message: "No se pudo crear la consulta",
                                                        }
                                                    }


                                                } catch (error) {
                                                    ctx.response.status = 500;
                                                    ctx.response.body = {
                                                        message: "Error interno al crear los registros",
                                                        error: error.message
                                                    }
                                                }
                                            }
                                            else {
                                                ctx.response.status = 405;
                                                ctx.response.body = {
                                                    message: "Los equipos no estan disponibles"
                                                }
                                            }

                                        }
                                        else {
                                            ctx.response.status = 405;
                                            ctx.response.body = {
                                                message: "El consultorio no esta disponible"
                                            }
                                        }

                                    }
                                    else {
                                        ctx.response.status = 405;
                                        ctx.response.body = {
                                            message: "El consultorio ya posee una reserva a esa hora"
                                        }
                                    }

                                }
                                else {
                                    ctx.response.status = 405;
                                    ctx.response.body = {
                                        message: "No se pudo identificar al consultorio que quiere"
                                    }
                                }

                            }

                            else {
                                ctx.response.status = 405;
                                ctx.response.body = {
                                    message: "No se pudo agregar o encontrar los tratamientos mencionados para esta consulta"
                                }
                            }
                        }
                        else {
                            ctx.response.status = 405;
                            ctx.response.body = {
                                message: "No se pudo identificar al responsable para esta consulta"
                            }
                        }
                    }

                    else {
                        ctx.response.status = 405;
                        ctx.response.body = {
                            message: "No se pudo identificar al cliente"
                        }
                    }


                }
                else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "Las fechas indicadas no estan en el formato correcto"
                    }
                }
            }
            else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message: "Faltan datos para poder crear una consulta"
                }
            }

        } catch (error) {
            ctx.response.status = 405;
            ctx.response.body = {
                error: error.message
            };
        }
    }

    plugin.controllers.user.cancelConsultation = async (ctx) => {
        try {
            if (
                ctx.request.body &&
                ctx.request.body.userNumber &&
                ctx.request.body.customerName &&
                ctx.request.body.customerLastname &&
                ctx.request.body.dateSince &&
                ctx.request.body.dateUntil
            ) {
                const dateSince = new Date(ctx.request.body.dateSince);
                const dateUntil = new Date(ctx.request.body.dateUntil);


                // SI LAS FECHAS NO VIENEN EN EL FORMATO DATE TIME ('AAAA-MM-DDTHH:MM:SS'), Y LA DECHA HASTA NO ES MAYOR A DESDE NO PASA
                if (!isNaN(dateSince.getTime()) && !isNaN(dateUntil.getTime()) && ((dateUntil.getTime()) > (dateSince.getTime()))) {

                    const customer = await strapi.db.query('api::customer-personal-information.customer-personal-information').findOne({
                        where: {
                            name: { $eqi: ctx.request.body.customerName },
                            lastname: { $eqi: ctx.request.body.customerLastname }
                        }
                    });

                    if (customer) {
                        const responsibleUser = await strapi.db.query('api::user-data.user-data').findOne({
                            where: {
                                cellphone: ctx.request.body.userNumber,
                            }
                        });

                        if (responsibleUser) {

                            const consultationConsultingRoomsThisDay2 = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                                populate: true
                            });

                            //ME TRAERA LOS REGISTROS DE ESE DIA 
                            const consultationConsultingRoomsThisDay = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                                where: {
                                    since: { $gte: dateSince },
                                    until: { $lte: dateUntil },
                                },
                                populate: true
                            });


                            if (consultationConsultingRoomsThisDay.length > 0 && !consultationConsultingRoomsThisDay.includes(null)) {

                                const consultationConsultingRooms = await Promise.all(consultationConsultingRoomsThisDay.map(async consultationConsultingRooms => {

                                    const consultation = await strapi.db.query('api::consultation.consultation').findOne({
                                        where: {
                                            id: consultationConsultingRooms.consultation.id
                                        },
                                        populate: true
                                    });

                                    const customerInArray = consultation.customer;
                                    const responsibleUserInArray = consultation.responsibleUser;


                                    if (customerInArray.id === customer.id && responsibleUserInArray.id === responsibleUser.id) {
                                        return consultationConsultingRooms;
                                    }
                                }));


                                //=>MAP REGRESA UN ARRAY PERO DEBERIA SER UN ARRAY CON UN ELEMENTO, EL QUE ESTOY BUSCANDO
                                if (consultationConsultingRooms.length === 1 && (!consultationConsultingRooms.includes(null) || !consultationConsultingRooms.includes(undefined))) {
                                    try {
                                        const consultationConsultingRoomsUpadte = await Promise.all(consultationConsultingRooms.map(async consultationConsultingRoom => {


                                            const seeHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                                where: {
                                                    consulting_room: consultationConsultingRoom.consultingRoom.id,
                                                    since: consultationConsultingRoom.since,
                                                    until: consultationConsultingRoom.until
                                                }
                                            });

                                            return await strapi.db.query('api::consulting-room-history.consulting-room-history').update({
                                                where: {
                                                    consulting_room: consultationConsultingRoom.consultingRoom.id,
                                                    since: consultationConsultingRoom.since,
                                                    until: consultationConsultingRoom.until
                                                },
                                                data:
                                                    { status: 'available' }
                                            });
                                        }));

                                        const equipmentHistoryPromises = [];

                                        const consultations = await Promise.all(consultationConsultingRooms.map(async consultationConsultingRoom => {
                                            return await strapi.db.query('api::consultation.consultation').findOne({
                                                where: {
                                                    id: consultationConsultingRoom.consultation.id,
                                                },
                                                populate: {
                                                    treatments: true
                                                }
                                            });
                                        }));

                                        consultations.forEach(async consultation => {

                                            const allTreatments = await Promise.all(consultation.treatments.map(async treatment => {
                                                return await strapi.db.query('api::treatment.treatment').findMany({
                                                    where: {
                                                        id: treatment.id,
                                                    },
                                                    populate: {
                                                        equipments: true
                                                    }
                                                });
                                            }));

                                            if (allTreatments[0].length > 0) {
                                                // Iterar sobre cada conjunto de tratamientos
                                                allTreatments.forEach(treatmentsSet => {
                                                    // Iterar sobre cada tratamiento dentro del conjunto
                                                    treatmentsSet.forEach(treatment => {
                                                        // Acceder a los equipos de cada tratamiento

                                                        if (treatment.equipments && treatment.equipments.length > 0) {
                                                            treatment.equipments.forEach(async equipment => {
                                                                const seeEquipmentHistory = await strapi.db.query('api::equipment-history.equipment-history').findOne({
                                                                    where: {
                                                                        equipment: equipment.id,
                                                                        since: consultationConsultingRooms[0].since,
                                                                        until: consultationConsultingRooms[0].until,
                                                                    }
                                                                });

                                                                const equipmentHistoryPromise = await strapi.db.query('api::equipment-history.equipment-history').update({
                                                                    where: {
                                                                        equipment: equipment.id,
                                                                        since: consultationConsultingRooms[0].since,
                                                                        until: consultationConsultingRooms[0].until,
                                                                    },
                                                                    data: {
                                                                        status: 'available'
                                                                    }
                                                                });

                                                                equipmentHistoryPromises.push(equipmentHistoryPromise);
                                                            });
                                                        }
                                                    });
                                                });
                                            }
                                        });

                                        // Aqui todas las promesas de bambio de estado de los historiales de equipo se concretan
                                        const equipmentHistoryUpadte = await Promise.all(equipmentHistoryPromises);

                                        const cancelConsultation = await Promise.all(consultationConsultingRooms.map(async consultationConsultingRoom => {
                                            return await strapi.db.query('api::consultation.consultation').update({
                                                where: {
                                                    id: consultationConsultingRoom.consultation.id,
                                                },
                                                data:
                                                    { status: 'cancel' }
                                            });
                                        }));

                                        if (cancelConsultation) {
                                            ctx.response.status = 200;
                                            ctx.response.body = {
                                                message: `Se cancelo exitosamente la consulta`,
                                                cancelConsultation: cancelConsultation
                                            }
                                        } else {


                                            ctx.response.status = 405;
                                            ctx.response.body = {
                                                message: `No se pudo cancelar la consulta, intentalo de nuevo`,
                                                cancelConsultation: cancelConsultation
                                            }
                                        }

                                    } catch (error) {
                                        ctx.response.status = 405;
                                        ctx.response.body = {
                                            message: "Lo siento pero algo salio mal y no pude cancelar la consulta",
                                            error: error.message
                                        };
                                    }
                                } else {
                                    ctx.response.status = 405;
                                    ctx.response.body = {
                                        message: `Este cliente tiene más de una consulta ese dia y no puedo saber cual, te recomiendo ir a la aplicación para cancelarla`
                                    }
                                }
                            } else {
                                ctx.response.status = 405;
                                ctx.response.body = {
                                    message: `No se encontraron consultas para esa fecha`
                                }
                            }
                        } else {
                            ctx.response.status = 405;
                            ctx.response.body = {
                                message: `No se pudo identificar a la responsable con el numero de telefono ${ctx.request.body.userNumber}`
                            }
                        }
                    } else {
                        ctx.response.status = 405;
                        ctx.response.body = {
                            message: `No se pudo identificar al cliente ${ctx.request.body.customerName} ${ctx.request.body.customerLastname}`
                        }
                    }
                } else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "Las fechas indicadas no estan en el formato correcto"
                    }
                }
            } else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message: "Lo siento pero parece que faltan datos para poder procesar",
                };
            }
        } catch (error) {
            ctx.response.status = 405;
            ctx.response.body = {
                message: "Lo siento pero parece que algo ha sucedido mal",
                error: error.message
            };
        }
    }

    // en modificar no update si no es pendiente
    // responsable, cliente no se edita
    // se edita : tratamientos (vine todo el array), consulting Room, since until


    plugin.controllers.user.simlpleCreateConsultation = async (ctx) => {
        console.log(ctx.request.body);
        try {
            if (ctx.request.body &&
                ctx.request.body.responsibleUserId &&
                ctx.request.body.customerId &&
                ctx.request.body.dateSince &&
                ctx.request.body.dateUntil &&
                ctx.request.body.treatments &&
                ctx.request.body.treatments.length > 0 &&
                ctx.request.body.consultingsRooms &&
                ctx.request.body.consultingsRooms.length > 0
            ) {

                const dateSince = new Date(ctx.request.body.dateSince);
                const dateUntil = new Date(ctx.request.body.dateUntil);

                // SI LAS FECHAS NO VIENEN EN EL FORMATO DATE TIME ('AAAA-MM-DDTHH:MM:SS'), Y LA DECHA HASTA NO ES MAYOR A DESDE NO PASA
                if (!isNaN(dateSince.getTime()) && !isNaN(dateUntil.getTime()) && ((dateUntil.getTime()) > (dateSince.getTime()))) {

                    const consultingRoomsInThisTimeRange = await Promise.all(ctx.request.body.consultingsRooms.map(async consultingsRoom => {
                        const consultingRomms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findOne({
                            where: {
                                consultingRoom: consultingsRoom.id,
                                $or: [
                                    {
                                        since: {
                                            $gte: dateSince,
                                            $lte: dateUntil
                                        }
                                    },
                                    {
                                        until: {
                                            $gte: dateSince,
                                            $lte: dateUntil
                                        }
                                    },
                                    {
                                        since: {
                                            $lte: dateSince
                                        },
                                        until: {
                                            $gte: dateUntil
                                        }
                                    }
                                ]
                            },
                            populate: {
                                consultation: true,
                                consultingRoom: true
                            }
                        });

                        return consultingRomms;
                    }));

                    var flag = true;

                    console.log(consultingRoomsInThisTimeRange);

                    //como no pude filtrar en en el populate las consultas canceladas
                    if (consultingRoomsInThisTimeRange.some(room => room !== null)) {

                        await Promise.all(consultingRoomsInThisTimeRange.map(async consultingRoomInThisTimeRange => {
                            //Si es pendiente o en proceso entonces no se puede agendar
                            if (consultingRoomInThisTimeRange.consultation.status != 'cancel') {
                                flag = false;
                            }
                        }));


                        const consultingRoomsHistory = await Promise.all(consultingRoomsInThisTimeRange.map(async consultingRoomInThisTimeRange => {
                            const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                where: {
                                    consulting_room: consultingRoomInThisTimeRange.consultingRoom.id,
                                    $or: [
                                        {
                                            since: {
                                                $gte: dateSince,
                                                $lte: dateUntil
                                            }
                                        },
                                        {
                                            until: {
                                                $gte: dateSince,
                                                $lte: dateUntil
                                            }
                                        },
                                        {
                                            since: {
                                                $lte: dateSince
                                            },
                                            until: {
                                                $gte: dateUntil
                                            }
                                        }
                                    ]
                                },
                                populate: {
                                    consultation: true
                                }
                            });

                            return consultingRoomHistory;
                        }));

                        if (consultingRoomsHistory.some(equitment => equitment !== null)) {
                            await Promise.all(consultingRoomsHistory.map(async consultingRoom => {
                                //Si es el consultorio no esta disponible porque ya esta ocupado o fuera de servicio no se puede registrar
                                if (consultingRoom.status != 'available') {
                                    flag = false;
                                }
                            }));
                        }


                        const equitmentsOcuppiedInThisTimeRange = await Promise.all(consultingRoomsInThisTimeRange.map(async consultingRoomInThisTimeRange => {
                            const equitmentHistory = await strapi.db.query('api::equipment-history.equipment-history').findOne({
                                where: {
                                    consultation: consultingRoomInThisTimeRange.consultation.id,
                                    $or: [
                                        {
                                            since: {
                                                $gte: dateSince,
                                                $lte: dateUntil
                                            }
                                        },
                                        {
                                            until: {
                                                $gte: dateSince,
                                                $lte: dateUntil
                                            }
                                        },
                                        {
                                            since: {
                                                $lte: dateSince
                                            },
                                            until: {
                                                $gte: dateUntil
                                            }
                                        }
                                    ]
                                },
                                populate: {
                                    consultation: true
                                }
                            });

                            return equitmentHistory;
                        }));

                        if (consultingRoomsHistory.some(equitment => equitment !== null)) {

                            await Promise.all(equitmentsOcuppiedInThisTimeRange.map(async equitment => {
                                //Si es el equipo no esta disponible porque ya esta ocupado o alquilado entonces no se puede registrar
                                if (equitment.status != 'available') {
                                    flag = false;
                                }
                            }));
                        }
                    }



                    //VALIDACIONES DE LOS HISTORIALES

                    if (flag) {
                        try {
                            const treatments = await Promise.all(ctx.request.body.treatments.map(async treatmentId => {
                                const treatment = await strapi.db.query('api::treatment.treatment').findOne({
                                    where: {
                                        id: treatmentId,
                                    },
                                    populate: {
                                        equipments: true,
                                    }
                                });


                                if (!treatment) {
                                    console.log(`Tratamiento no encontrado: ${treatment}`);
                                    return null;
                                }

                                return treatment;
                            }));


                            if (treatments.length > 0 && !treatments.includes(null)) {

                                const newConsultation = await strapi.db.query('api::consultation.consultation').create({
                                    data: {
                                        customer: ctx.request.body.customerId,
                                        treatments: ctx.request.body.treatments.map(treatment => treatment),
                                        responsibleUser: ctx.request.body.responsibleUserId,
                                        comments: ctx.request.body.comments ?? null,
                                        status: 'pending',
                                        since: dateSince,
                                        until: dateUntil,
                                        publishedAt: new Date()
                                    },
                                });

                                const consultationsConsultingsRooms = await Promise.all(ctx.request.body.consultingsRooms.map(async consultingRoom => {
                                    const consultationConsultingRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').create({
                                        data: {
                                            consultation: newConsultation.id,
                                            consultingRoom: consultingRoom.id,
                                            since: consultingRoom.dateSince,
                                            until: consultingRoom.dateUntil,
                                            publishedAt: new Date()
                                        },
                                    });
                                    return consultationConsultingRoom
                                }));

                                //Verificar que no haya registros en los historiales de consulting-room-history con consultorios ocupados
                                const consultingRoomsHistories = await Promise.all(ctx.request.body.consultingsRooms.map(async consultingRoom => {
                                    const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').create({
                                        data: {
                                            consulting_room: consultingRoom.id,
                                            consultation: newConsultation.id,
                                            status: 'occupied',
                                            since: consultingRoom.dateSince,
                                            until: consultingRoom.dateUntil,
                                            publishedAt: new Date()
                                        },
                                    });
                                    return consultingRoomHistory
                                }));


                                //Verificar que no haya registros en los historiales de equipment-history con consultorios ocupados
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
                                                    equipment: equipment.id,
                                                    status: 'occupied',
                                                    consultation: newConsultation.id,
                                                    // tiene que ser el desde y hasta de la consulta?
                                                    since: dateSince,
                                                    until: dateUntil,
                                                    publishedAt: new Date()
                                                },
                                            });

                                            // Agrega la promesa al array de promesas
                                            equipmentHistoryPromises.push(equipmentHistoryPromise);
                                        });
                                    }
                                });

                                // Espera a que se completen todas las promesas antes de continuar
                                const equipmentHistories = await Promise.all(equipmentHistoryPromises);

                                if (newConsultation &&
                                    consultationsConsultingsRooms &&
                                    consultingRoomsHistories &&
                                    equipmentHistories &&
                                    equipmentHistories.length > 0 &&
                                    consultationsConsultingsRooms.length > 0 &&
                                    consultingRoomsHistories.length > 0) {

                                    ctx.response.status = 200;
                                    ctx.response.body = {
                                        message: "Consulta creada con exito",
                                        newConsultation: newConsultation
                                    }
                                } else {
                                    equipmentHistories.forEach(async equitmentHistory => {
                                        await strapi.db.query('api::equipment-history.equipment-history').delete({
                                            where: { id: equitmentHistory.id },
                                        });
                                    });

                                    consultingRoomsHistories.forEach(async consultingRoomHistory =>
                                        await strapi.db.query('api::consulting-room-history.consulting-room-history').delete({
                                            where: { id: consultingRoomHistory.id },
                                        })
                                    );

                                    consultationsConsultingsRooms.forEach(async consultationConsultingRoom =>
                                        await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').delete({
                                            where: { id: consultationConsultingRoom.id },
                                        })
                                    );

                                    await strapi.db.query('api::consultation.consultation').delete({
                                        where: { id: newConsultation.id },
                                    });

                                    ctx.response.status = 500;
                                    ctx.response.body = {
                                        message: "No se pudo registrar en la consulta, intentalo de nuevo",
                                    }
                                }
                            }

                        } catch (error) {
                            ctx.response.status = 405;
                            ctx.response.body = {
                                message: "Error al crear los registros",
                                error: error.message
                            }
                        }
                    } else {
                        ctx.response.status = 405;
                        ctx.response.body = {
                            message: "Ya hay una consulta agendada en ese rango horario",
                        }
                    }
                } else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "La fechas no estan en el formato correcto"
                    }
                }

            } else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message: "No se cuenta con todos los datos nesesarios para crear una consulta"
                }
            }
        } catch (error) {
            ctx.response.status = 500;
            ctx.response.body = {
                message: "Error inicial al procesar la creacion de consulta",
                error: error.message
            }
        }
    }

    plugin.controllers.user.simlpleUpdateConsultation = async (ctx) => {
        try {
            if (ctx.request.body &&
                ctx.request.body.consultationId
            ) {

                const consultation = await strapi.db.query('api::consultation.consultation').findOne({
                    where: {
                        id: ctx.request.body.consultationId,
                    },
                    populate: {
                        customer: true,
                        treatments: true,
                        responsibleUser: true
                    }
                });

                const consultationConsultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findMany({
                    where: {
                        consultation: consultation.id
                    },
                    populate: {
                        consultation: true,
                        consultingRoom: true
                    }
                });

                const consultingRoomHistories = await strapi.db.query('api::consulting-room-history.consulting-room-history').findMany({
                    where: {
                        consultation: consultation.id
                    },
                    populate: {
                        consulting_room: true
                    }
                });

                const equipmentHistory = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                    where: {
                        consultation: consultation.id
                    },
                    populate: {
                        equipment: true,
                        consultation: true
                    }
                });

                console.log(consultation);
                if (consultation) {

                    //Se quiere modificar fechas?
                    if (ctx.request.body.dateSince || ctx.request.body.dateUntil) {

                        var flag = false;
                        var message = "";

                        const consultationsInThisTimeRange = await strapi.db.query('api::consultation.consultation').findMany({
                            where: {
                                id: { $ne: consultation.id },
                                $or: [
                                    {
                                        since: {
                                            $gte: ctx.request.body.dateSince ?? consultation.since,
                                            $lte: ctx.request.body.dateUntil ?? consultation.until
                                        }
                                    },
                                    {
                                        until: {
                                            $gte: ctx.request.body.dateSince ?? consultation.since,
                                            $lte: ctx.request.body.dateUntil ?? consultation.until
                                        }
                                    },
                                    {
                                        since: {
                                            $lte: ctx.request.body.dateSince ?? consultation.since
                                        },
                                        until: {
                                            $gte: ctx.request.body.dateUntil ?? consultation.until
                                        }
                                    }
                                ]
                            }
                        });

                        console.log(consultationsInThisTimeRange);

                        if (consultationsInThisTimeRange.some(consultation => consultation !== null)) {
                            console.log("Entro aca");
                             flag = true;
                             message = "ya hay una consulta en ese rango horario";
                        }

                        const consultationConsultingRoomsInThisTimeRange = await Promise.all(consultationConsultingRooms.map(async consultationnConsultingsRoom => {
                            const consultingRooms = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').findOne({
                                where: {
                                    id: { $ne: consultation.id },
                                    $or: [
                                        {
                                            since: {
                                                $gte: ctx.request.body.dateSince ?? consultationnConsultingsRoom.since,
                                                $lte: ctx.request.body.dateUntil ?? consultationnConsultingsRoom.until
                                            }
                                        },
                                        {
                                            until: {
                                                $gte: ctx.request.body.dateSince ?? consultationnConsultingsRoom.since,
                                                $lte: ctx.request.body.dateUntil ?? consultationnConsultingsRoom.until
                                            }
                                        },
                                        {
                                            since: {
                                                $lte: ctx.request.body.dateSince ?? consultationnConsultingsRoom.since
                                            },
                                            until: {
                                                $gte: ctx.request.body.dateUntil ?? consultationnConsultingsRoom.until
                                            }
                                        }
                                    ]
                                }
                            });

                            return consultingRooms;
                        }));

                        console.log(consultationConsultingRoomsInThisTimeRange);

                        if (consultationConsultingRoomsInThisTimeRange.some(consultation => consultation !== null)) {
                            console.log("Entro aca");
                            flag = true;
                            message =`${message}, ya hay registros en consultationConsultingRoom en ese rango horario`;
                        }

                        const consultingRoomHistoriesInThisTimeRange = await Promise.all(consultingRoomHistories.map(async consultingRoomHistory => {
                            const consultingRoomHistoies = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                where: {
                                    id: { $ne: consultation.id },
                                    status: { $ne: 'available' },
                                    $or: [
                                        {
                                            since: {
                                                $gte: ctx.request.body.dateSince ?? consultingRoomHistory.since,
                                                $lte: ctx.request.body.dateUntil ?? consultingRoomHistory.until
                                            }
                                        },
                                        {
                                            until: {
                                                $gte: ctx.request.body.dateSince ?? consultingRoomHistory.since,
                                                $lte: ctx.request.body.dateUntil ?? consultingRoomHistory.until
                                            }
                                        },
                                        {
                                            since: {
                                                $lte: ctx.request.body.dateSince ?? consultingRoomHistory.since
                                            },
                                            until: {
                                                $gte: ctx.request.body.dateUntil ?? consultingRoomHistory.until
                                            }
                                        }
                                    ]
                                }
                            });

                            return consultingRoomHistoies;
                        }));

                        console.log(consultingRoomHistoriesInThisTimeRange);

                        if (consultingRoomHistoriesInThisTimeRange.some(consultation => consultation !== null)) {
                            console.log("Entro aca");
                            flag = true;
                            message = `${message}, ya hay registros en el historial de consultorios en ese rango horario`;
                        }

                        const equipmentHistoriesInThisTimeRange = await Promise.all(equipmentHistory.map(async equipmentHistory => {
                            const equipmentHistories = await strapi.db.query('api::consulting-room-history.consulting-room-history').findOne({
                                where: {
                                    id: { $ne: consultation.id },
                                    status: { $ne: 'available' },
                                    $or: [
                                        {
                                            since: {
                                                $gte: ctx.request.body.dateSince ?? equipmentHistory.since,
                                                $lte: ctx.request.body.dateUntil ?? equipmentHistory.until
                                            }
                                        },
                                        {
                                            until: {
                                                $gte: ctx.request.body.dateSince ?? equipmentHistory.since,
                                                $lte: ctx.request.body.dateUntil ?? equipmentHistory.until
                                            }
                                        },
                                        {
                                            since: {
                                                $lte: ctx.request.body.dateSince ?? equipmentHistory.since
                                            },
                                            until: {
                                                $gte: ctx.request.body.dateUntil ?? equipmentHistory.until
                                            }
                                        }
                                    ]
                                }
                            });

                            return equipmentHistories;
                        }));

                        console.log(equipmentHistoriesInThisTimeRange);

                        if (equipmentHistoriesInThisTimeRange.some(consultation => consultation !== null)) {
                            console.log("Entro aca");
                            flag = true;
                            message = message = `${message}, ya hay registros en el historial de equipos en ese rango horario`;
                        }

                        //Si encontro registros que se solapan con los horarios entonces detener la ejecucion
                        if (flag) {
                            console.log(flag);
                            ctx.response.status = 405;
                            ctx.response.body = {
                                message: message != "" ? message : "Ya hay registros en esos horarios"
                            };
                            return
                        }
                    }

                    //Pasamos a modificar los registros
                    try {
                        const updateConsultation = await strapi.db.query('api::consultation.consultation').update({
                            where: {
                                id: ctx.request.body.consultationId
                            },
                            data: {
                                treatments: ctx.request.body.treatments?.map(treatment => treatment.id) ?? consultation.treatments,
                                comments: ctx.request.body.comments ?? consultation.comments,
                                consultingRooms: ctx.request.body.consultingsRooms.map(consultingRoom => consultingRoom.id) ?? consultation.consultingRooms,
                                status: ctx.request.body.status ?? consultation.status,
                                since: ctx.request.body.dateSince ?? consultation.since,
                                until: ctx.request.body.dateUntil ?? consultation.until
                            },
                        });

                        console.log(updateConsultation);

                        let consultationsConsultingsRooms;
                        let consultingRoomsHistories;
                        // ctx.request.body.consultingsRooms tiene que traerme un nuevo status, si van a quedar libres, fuera de servicio o que
                        if (ctx.request.body.consultingsRooms) {
                            console.log("Entro")
                            consultationsConsultingsRooms = await Promise.all(ctx.request.body.consultingsRooms.map(async consultingRoom => {
                                const consultationConsultingRoom = await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').update({
                                    where: {
                                        consultation: ctx.request.body.consultationId
                                    },
                                    data: {
                                        consultingRoom: consultingRoom.consultingRoom,
                                        since: consultingRoom.dateSince,
                                        until: consultingRoom.dateUntil,
                                    },
                                });
                                return consultationConsultingRoom
                            }));

                            console.log(consultationsConsultingsRooms)

                            consultingRoomsHistories = await Promise.all(ctx.request.body.consultingsRooms.map(async consultingRoom => {
                                const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').update({
                                    where: {
                                        consultation: ctx.request.body.consultationId
                                    },
                                    data: {
                                        consulting_room: consultingRoom.id,
                                        //Tiene que venir el status a editar
                                        status: consultingRoom.status,
                                        since: consultingRoom.dateSince,
                                        until: consultingRoom.dateUntil,
                                    },
                                });
                                return consultingRoomHistory
                            }));

                            console.log(consultingRoomsHistories)
                        }

                        let equipmentHistories = [];
                        if (ctx.request.body.treatments) {
                            const equipmentHistoryPromises = [];

                            const treatments = await Promise.all(ctx.request.body.treatments.map(async treatment => {
                                const treatmentWithEquitment = await strapi.db.query('api::treatment.treatment').findOne({
                                    where: {
                                        id: treatment.id
                                    },
                                    populate: {
                                        equipments: true
                                    }
                                });
                                return treatmentWithEquitment
                            }));

                            console.log(treatments);

                            for (const treatment of treatments) {
                                console.log(treatment.equipments)
                                if (treatment.equipments && treatment.equipments.length > 0) {
                                    for (const equipment of treatment.equipments) {
                                        const equipmentHistoryPromise = strapi.db.query('api::equipment-history.equipment-history').update({
                                            where: {
                                                equipment: equipment.id,
                                                consultation: ctx.request.body.consultationId
                                            },
                                            data: {
                                                status: treatment.equitmentStatus,
                                                since: treatment.dateSince,
                                                until: treatment.dateUntil,
                                            },
                                        });

                                        equipmentHistoryPromises.push(equipmentHistoryPromise);
                                    }
                                }
                            }

                            console.log(equipmentHistoryPromises);

                            equipmentHistories = await Promise.all(equipmentHistoryPromises);
                        }

                        ctx.response.status = 200;
                        ctx.response.body = {
                            message: "Consulta modificada con exito",
                            updateConsultation: updateConsultation
                        }

                    } catch (error) {
                        //Con las copias de los originales reestablecer sus valores si algo sale mal

                        equipmentHistory.forEach(async equitmentHistory => {
                            await strapi.db.query('api::equipment-history.equipment-history').update({
                                where: { id: equitmentHistory.id },
                                data: {
                                    equipment: equitmentHistory.equitment.id,
                                    consultation: equitmentHistory.consultation.id,
                                    status: equitmentHistory.status,
                                    since: equitmentHistory.since,
                                    until: equitmentHistory.until,
                                    canceledRental: equitmentHistory.canceledRental
                                }
                            });
                        });

                        consultingRoomHistories.forEach(async consultingRoomHistoriy => {
                            await strapi.db.query('api::consulting-room-history.consulting-room-history').update({
                                where: { id: consultingRoomHistoriy.id },
                                data: {
                                    consulting_room: consultingRoomHistoriy.consulting_room.id,
                                    consultation: consultingRoomHistoriy.consultation.id,
                                    status: consultingRoomHistoriy.status,
                                    since: consultingRoomHistoriy.since,
                                    until: consultingRoomHistoriy.until,
                                }
                            });
                        });



                        consultationConsultingRooms.forEach(async consultationConsultingRoom => {
                            await strapi.db.query('api::consultation-consulting-room.consultation-consulting-room').update({
                                where: { id: consultationConsultingRoom.id },
                                data: {
                                    consultingRoom: consultationConsultingRoom.consultingRoom.id,
                                    consultation: consultationConsultingRoom.consultation.id,
                                    since: consultationConsultingRoom.since,
                                    until: consultationConsultingRoom.until,
                                    notifyCustomer: consultationConsultingRoom.notifyCustomer,
                                    notifyUser: consultationConsultingRoom.notifyUser
                                }
                            });
                        });


                        await strapi.db.query('api::consultation.consultation').update({
                            where: { id: consultation.id },
                            data: {
                                customer: consultation.customer.id,
                                responsibleUser: consultation.responsibleUser.id,
                                treatments: consultation.treatments.map(treatment => treatment.id),
                                status: consultation.status,
                                since: consultation.since,
                                until: consultation.until,
                                comments: consultation.comments,
                                notifyCustomer: consultation.notifyCustomer,
                                notifyUser: consultation.notifyUser
                            }
                        });

                        ctx.response.status = 500;
                        ctx.response.body = {
                            message: "No se pudo modificar la consulta, intentalo de nuevo",
                        }
                    }

                } else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "La consulta esta en proceso o finalizada, por lo que no se puede modificar"
                    }
                }
            } else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message: "No se cuenta con todos los datos nesesarios para modificar la consulta consulta"
                }
            }
        } catch (error) {
            ctx.response.status = 405;
            ctx.response.body = {
                message: "Error inicial al procesar la modificación de la consulta",
                error: error.message
            }
        }
    }

    plugin.controllers.user.simlpleCancelConsultation = async (ctx) => {

        console.log(ctx.request.body.consultationId);
        try {
            if (ctx.request.body &&
                ctx.request.body.consultationId
            ) {


                const consultation = await strapi.db.query('api::consultation.consultation').findOne({
                    where: {
                        id: ctx.request.body.consultationId,
                        status: { $eqi: 'pending' }
                    }
                });

                const consultingRoomHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').findMany({
                    where: {
                        consultation: ctx.request.body.consultationId,
                    }
                });

                const equitmentHistory = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                    where: {
                        consultation: ctx.request.body.consultationId,
                    }
                });


                if (consultation) {

                    try {
                        const cancelConsultation = await strapi.db.query('api::consultation.consultation').update({
                            where: {
                                id: ctx.request.body.consultationId
                            },
                            data: {
                                status: 'cancel',
                                notifyUser: true,
                                notifyCustomer: true
                            },
                        });

                        // necesito los ids de los consultorios de esa consulta para cambiarles el estado en su historial
                        // consultation-consulting-room no tiene status asi que no se toca nada


                        const updateConsultingRoomsHistories = await Promise.all(consultingRoomHistory.map(async (consultingRoomsHistory) => {
                            const updateHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').update({
                                where: {
                                    id: consultingRoomsHistory.id
                                },
                                data: {
                                    status: 'available',
                                },
                            });

                            return updateHistory;
                        }));


                        console.log(updateConsultingRoomsHistories);


                        const updateEquitmentHistories = await Promise.all(equitmentHistory.map(async (equitmentsHistory) => {
                            const updateHistory = await strapi.db.query('api::consulting-room-history.consulting-room-history').update({
                                where: {
                                    id: equitmentsHistory.id
                                },
                                data: {
                                    status: 'available',
                                },
                            });

                            return updateHistory;
                        }));

                        ctx.response.status = 200;
                        ctx.response.body = {
                            message: "Consulta cancelada con exito",
                            cancelConsultation: cancelConsultation
                        }
                    } catch (error) {


                        equitmentHistory.forEach(async equitmentHistory => {
                            await strapi.db.query('api::equipment-history.equipment-history').update({
                                where: { id: equitmentHistory.id },
                                data: {
                                    status: equitmentHistory.status,
                                }
                            });
                        });

                        consultingRoomHistory.forEach(async consultingRoomHistoriy => {
                            await strapi.db.query('api::consulting-room-history.consulting-room-history').update({
                                where: { id: consultingRoomHistoriy.id },
                                data: {
                                    status: consultingRoomHistoriy.status
                                }
                            });
                        });


                        await strapi.db.query('api::consultation.consultation').update({
                            where: { id: consultation.id },
                            data: {
                                status: consultation.status,
                                notifyCustomer: consultation.notifyCustomer,
                                notifyUser: consultation.notifyUser
                            }
                        });

                        ctx.response.status = 500;
                        ctx.response.body = {
                            message: "No se pudo cancelar la consulta, intentalo de nuevo",
                        }

                    }

                } else {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "La consulta esta en proceso o finalizada, por lo que no se puede modificar"
                    }
                }
            } else {
                ctx.response.status = 405;
                ctx.response.body = {
                    message: "No se cuenta con todos los datos nesesarios para modificar la consulta consulta"
                }
            }
        } catch (error) {
            ctx.response.status = 405;
            ctx.response.body = {
                message: "Error inicial al procesar la modificación de la consulta",
                error: error.message
            }
        }
    }

    plugin.controllers.user.simlpleDeleteHistoryEquitments = async (ctx) => {
        try {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999);

                try {

                    const equitmentsHistory = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                        where: {
                            since: {
                                $gte: yesterday
                            }
                        }
                    });
                
                    console.log("equitmentsHistory:", equitmentsHistory);
                
                    if(equitmentsHistory.length > 0) {
                        await Promise.all(equitmentsHistory.map(async (equitmentHistory) => {
                            console.log("Deleting record with id:", equitmentHistory.id);
                            await strapi.db.query('api::equipment-history.equipment-history').delete({
                                where: {
                                    id: equitmentHistory.id,
                                }
                            });
                            console.log("Deleted record with id:", equitmentHistory.id);
                        }));
    
    
                        const deletionRegister = await strapi.db.query('api::deleted-history.deleted-history').create({
                            data: {
                                historyName: 'equipment-history',
                                date: new Date(),
                                publishedAt: new Date()
                            },
                        });
    
                        if (deletionRegister) {
                            ctx.response.status = 200;
                            ctx.response.body = {
                                message: "Registros de equipos eliminados con exito",
                                deletionRegister: deletionRegister
                            }
                        }
                    }

                } catch (error) {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "Error inicial al borrar los historiales de equipo",
                        error: error.message
                    }
                }
        } catch (error) {
            ctx.response.status = 405;
            ctx.response.body = {
                message: "Error inicial al procesar la eliminación del historial de equipos",
                error: error.message
            }
        }
    }

    plugin.controllers.user.simpleDeleteConsultingRoomHistory = async (ctx) => {
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
        },
        {
            method: "PUT",
            path: "/consultation/cancelConsultation",
            handler: "user.cancelConsultation",
            config: {
                prefix: "",
                policies: []
            },
        },
        {
            method: "PUT",
            path: "/consultation/simlpleUpdateConsultation",
            handler: "user.simlpleUpdateConsultation",
            config: {
                prefix: "",
                policies: []
            },
        },
        {
            method: "PUT",
            path: "/consultation/simlpleCancelConsultation",
            handler: "user.simlpleCancelConsultation",
            config: {
                prefix: "",
                policies: []
            },
        },
        {
            method: "DELETE",
            path: "/consultation/simlpleDeleteHistoryEquitments",
            handler: "user.simlpleDeleteHistoryEquitments",
            config: {
                prefix: "",
                policies: []
            },
        },
        {
            method: "DELETE",
            path: "/consultation/simpleDeleteConsultingRoomHistory",
            handler: "user.simpleDeleteConsultingRoomHistory",
            config: {
                prefix: "",
                policies: []
            },
        }
    )
    return plugin
}

