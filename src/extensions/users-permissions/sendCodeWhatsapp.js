const axios = require('axios');


async function sendCodeWhatsApp (code, number) {

  let data = JSON.stringify({
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": number,
    "type": "template",
    "template": {
      "name": "recuperacion_de_cuenta",
      "language": {
        "code": "es_AR"
      },
      "components": [
        {
          "type": "body",
          "parameters": [
            {
              "type": "text",
              "text": code
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
      'Authorization': `Bearer ${process.env.WHATSAPP_CLOUD_API_KEY}`, 
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
    sendCodeWhatsApp
}
