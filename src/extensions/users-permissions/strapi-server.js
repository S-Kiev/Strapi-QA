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
      }
    )

    return plugin
}
