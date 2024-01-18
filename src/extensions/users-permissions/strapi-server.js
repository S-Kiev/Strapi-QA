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
                    console.log("El error es lo nuevo");
                    const consultingRommsInThisTimeRange = await Promise.all(ctx.request.body.consultingsRooms.map(async consultingsRoom => {
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
                                consultation: true
                            }
                        });

                        return consultingRomms;
                    }));

                    var flag = true;

                    //como no pude filtrar en en el populate las consultas canceladas
                    await Promise.all(consultingRommsInThisTimeRange.map(async consultingRommInThisTimeRange => {
                        //Si es pendiente o en proceso entonces no se puede agendar
                        if (consultingRommInThisTimeRange.consultation.status != 'cancel') {
                            flag = false;
                        }
                    }))

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
                                    equipmentHistories.forEach(async equitment => {
                                        await strapi.db.query('api::equipment-history.equipment-history').delete({
                                            where: { id: equitment.id },
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
                        status: { $eq: 'pending' }
                    }
                });

                console.log(consultation);
                if (consultation) {

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

                        const treatments =  await Promise.all(ctx.request.body.treatments.map(async treatment => {
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

                    console.log("updateConsultation");
                    console.log(updateConsultation);
                    console.log("consultationsConsultingsRooms");
                    console.log(consultationsConsultingsRooms);
                    console.log("consultingRoomsHistories");
                    console.log(consultingRoomsHistories);
                    console.log("equipmentHistories.length > 0");
                    console.log(equipmentHistories.length > 0);
                    console.log("consultationsConsultingsRooms.length > 0");
                    console.log(consultationsConsultingsRooms.length > 0);                    
                    console.log("consultingRoomsHistories.length > 0");
                    console.log(consultingRoomsHistories.length > 0);



                    if (updateConsultation &&
                        consultationsConsultingsRooms &&
                        consultingRoomsHistories &&
                        equipmentHistories &&
                        equipmentHistories.length > 0 &&
                        consultationsConsultingsRooms.length > 0 &&
                        consultingRoomsHistories.length > 0) {

                        ctx.response.status = 200;
                        ctx.response.body = {
                            message: "Consulta modificada con exito",
                            updateConsultation: updateConsultation
                        }

                    } else {
                        //Hacer una copia de los originales con FindMany => Borrar y volver a crear con los originales

                        /*
                        equipmentHistories.forEach(async equitment => {
                            await strapi.db.query('api::equipment-history.equipment-history').delete({
                                where: { id: equitment.id },
                            });
                        });

                        consultingRoomsHistories.forEach(async consultingRoomHistoriy => {
                            await strapi.db.query('api::equipment-history.equipment-history').delete({
                                where: { id: consultingRoomHistoriy.id },
                            });
                        });

                        consultationsConsultingsRooms.forEach(async consultationConsultingRoom => {
                            await strapi.db.query('api::equipment-history.equipment-history').delete({
                                where: { id: consultationConsultingRoom.id },
                            });
                        });

                        await strapi.db.query('api::consultation.consultation').delete({
                            where: { id: updateConsultation.id },
                        });
                        */

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
                console.log(consultation);


                if (consultation) {

                    const cancelConsultation = await strapi.db.query('api::consultation.consultation').update({
                        where: {
                            id: ctx.request.body.consultationId
                        },
                        data: {
                            status: 'cancel',
                        },
                    });

                console.log(cancelConsultation);
                    // necesito los ids de los consultorios de esa consulta para cambiarles el estado en su historial
                    // consultation-consulting-room no tiene status asi que no se toca nada

                    const consultingRoomsHistories = await strapi.db.query('api::consulting-room-history.consulting-room-history').findMany({
                        where: {
                            consultation: ctx.request.body.consultationId
                        }
                    });

                    
                     const updateConsultingRoomsHistories = await Promise.all(consultingRoomsHistories.map(async (consultingRoomsHistory) => {
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

                const equitmentsHistories = await strapi.db.query('api::equipment-history.equipment-history').findMany({
                    where: {
                        consultation: ctx.request.body.consultationId
                    }
                });

                const updateEquitmentHistories = await Promise.all(equitmentsHistories.map(async (equitmentsHistory) => {
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


                console.log(updateEquitmentHistories);


                    if (cancelConsultation &&
                        updateConsultingRoomsHistories &&
                        updateEquitmentHistories
                    ) {

                        ctx.response.status = 200;
                        ctx.response.body = {
                            message: "Consulta cancelada con exito",
                            cancelConsultation: cancelConsultation
                        }

                    } else {
                        //Hacer una copia de los originales con FindMany => Borrar y volver a crear con los originales
                        /*
                        if (cancelConsultation && consultingsRoomsHistories && equipmentsHistories &&
                            consultingsRoomsHistories.length > 0 && equipmentsHistories.length > 0) {
                            // Éxito: todos los registros se actualizaron correctamente
                            ctx.response.status = 200;
                            ctx.response.body = {
                                message: "Consulta cancelada con éxito",
                                cancelConsultation: cancelConsultation
                            };
                        } else {
                            // Error: Al menos un registro no se actualizó correctamente
    
                            // Hacer una copia de los registros originales
                            const originalConsultingHistories = await strapi.query('consulting-room-history').findMany({
                                consultation: ctx.request.body.consultationId,
                            });
    
                            const originalEquipmentHistories = await strapi.query('equipment-history').findMany({
                                consultation: ctx.request.body.consultationId,
                            });
    
                            // Borrar los registros actualizados
                            await strapi.query('consulting-room-history').delete({
                                consultation: ctx.request.body.consultationId,
                            });
    
                            await strapi.query('equipment-history').delete({
                                consultation: ctx.request.body.consultationId,
                            });
    
                            // Volver a crear los registros originales
                            await strapi.query('consulting-room-history').createMany(originalConsultingHistories);
                            await strapi.query('equipment-history').createMany(originalEquipmentHistories);
    
                            // Devolver una respuesta de error
                            ctx.response.status = 500;
                            ctx.response.body = {
                                message: "Error al cancelar la consulta. Se ha realizado un rollback.",
                            };
                        }
                        */
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
            if (ctx.request.body) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(23, 59, 59, 999);

                try {
                    await strapi.db.query('api::equipment-history.equipment-history').deleteMany({
                        where: {
                            since: {
                                $lte: yesterday
                            }
                        }
                    });

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

                } catch (error) {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "Error inicial al borrar los historiales de equipo",
                        error: error.message
                    }
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

    plugin.controllers.user.simlpleDeleteConsultingRoomHistory = async (ctx) => {
        try {
            if (ctx.request.body) {
                const today = new Date();
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                yesterday.setHours(23, 59, 59, 999);

                try {
                    await strapi.db.query('api::consulting-room-history.consulting-room-history').deleteMany({
                        where: {
                            since: {
                                $lte: yesterday
                            }
                        }
                    });

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

                } catch (error) {
                    ctx.response.status = 405;
                    ctx.response.body = {
                        message: "Error inicial al borrar los historiales de consultorios",
                        error: error.message
                    }
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
            path: "/consultation/simlpleDeleteConsultingRoomHistory",
            handler: "user.simlpleDeleteConsultingRoomHistory",
            config: {
                prefix: "",
                policies: []
            },
        }
    )
    return plugin
}

