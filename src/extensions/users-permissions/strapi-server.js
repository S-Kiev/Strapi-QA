let ultimateCode = '';
let validate = 0;
let user;

const { generateCode } = require('./generateCode');

module.exports = (plugin) => {

  plugin.controllers.user.sendCode = async (ctx) => {

    //Podria buscar y validar el numero de telefono cuando tenga la tabla infoUsuario
    if ( !ctx.request.body.number ) {

            if ( !ctx.request.body.username || !ctx.request.body.email ) {
                const user = await strapi.query('plugin::users-permissions.user').findOne({
                    where: {
                        $or: [
                        {
                            username: { $eqi : ctx.request.body.username },
                        },
                        {
                            createdAt: { $eqi : ctx.request.body.email },
                        },
                        ],
                    },
                });

                //Aqui buscar el numero de Usuario en la tabla infoUsuario

                if (user == undefined || user == null) {
                    ctx.response.status = 401;
                    ctx.response.body = {
                    message: `Usuario incorrecto`
                    };
                } else {
                    const code = generateCode();

                    //Aqui si ya tengo el usuario y codigo guardar esos datos en una tabla junto con el manejo del tiempo para validez
                    //validate = new Date().getTime() + 60 * 60 * 1000;
    
                    //Aqui enviar el codigo por Whatsapp

                    ctx.response.status = 200;
                    ctx.response.body = {
                        message: `Operacion ejecutada correctamente`,
                        code : code,
                        user: user.id
                    };



                }

        } else {
            ctx.response.status = 401;
            ctx.body = {
            message: `Se requiere numero de telefono`
            };
        }
    }
}
plugin.controllers.user.validateCode = async (ctx) => {

    if ( !ctx.request.body.code || !ctx.request.body.newPassword) {

        //Con el codigo busco en la tabla (idUser, code, validSince, validUntil) el id del usuario
        //enviar el id de Usuario y la new Password para que Frontend use el update
        ctx.response.status = 200;
        ctx.response.body = {
            message: `Operacion ejecutada correctamente`
        };

    } else {
        ctx.response.status = 401;
        ctx.body = {
        message: `Se requiere un código y/o contraseña`
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
        method: "POST",
        path: "/user/validateCode",
        handler: "user.validateCode",
        config: {
          prefix: "",
          policies: []
        },
      }
    )

    return plugin
}