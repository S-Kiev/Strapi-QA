const axios = require('axios');

async function sendNotifyTemplateToCollaborator( cellphone, name, nameCustumer, lastnameCustomer, professionCustomer, addressCustomer, phoneCustomer) {
    let data = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": cellphone,
        "type": "template",
        "template": {
          "name": "notificacion_de_consulta_para_responsable",
          "language": {
            "code": "es_AR"
          },
          "components": [
            {
              "type": "body",
              "parameters": [
                {
                  "type": "text",
                  "text": name
                },
                {
                  "type": "text",
                  "text": nameCustumer
                },
                {
                  "type": "text",
                  "text": lastnameCustomer
                },
                {
                  "type": "text",
                  "text": professionCustomer
                },
                {
                  "type": "text",
                  "text": addressCustomer
                },
                {
                  "type": "text",
                  "text": phoneCustomer
                }
              ]
            }
          ]
        }
      });
      
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://graph.facebook.com/v17.0/146235795241755/messages',
        headers: { 
          'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`, 
          'Content-Type': 'application/json'
        },
        data : data
      };
      
      axios.request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      });   
}

async function sendNotifyTemplateToCustomer( cellphone, name, lastname, hour ) {
    let data = JSON.stringify({
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": cellphone,
        "type": "template",
        "template": {
          "name": "notificacion_de_consulta_para_clientes",
          "language": {
            "code": "es_AR"
          },
          "components": [
            {
              "type": "body",
              "parameters": [
                {
                  "type": "text",
                  "text": name
                },
                {
                  "type": "text",
                  "text": lastname
                },
                {
                  "type": "text",
                  "text": hour
                }
              ]
            }
          ]
        }
      });
      
      let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://graph.facebook.com/v17.0/146235795241755/messages',
        headers: { 
          'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`, 
          'Content-Type': 'application/json'
        },
        data : data
      };
      
      axios.request(config)
      .then((response) => {
        console.log(JSON.stringify(response.data));
      })
      .catch((error) => {
        console.log(error);
      });
      
}



module.exports = {
    sendNotifyTemplateToCollaborator,
    sendNotifyTemplateToCustomer
}
