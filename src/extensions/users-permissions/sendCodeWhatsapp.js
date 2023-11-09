const axios = require('axios');


async function sendCodeWhatsApp (code, number) {

  console.log(code);
  console.log(number);

  let data = JSON.stringify({
    "whatsappBotKey": "EsteticaNatural",
    "code": code,
    "number": number
  });
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://bot-whatsapp-openai-production.up.railway.app/sendCode',
    headers: { 
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