const axios = require('axios');


async function sendCodeWhatsApp (code, number) {

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
    
    
      try {
        axios.request(config).then((res)=>{
            console.log('Bien');
            return res
        })
      } catch(error) {
        return error
      }  
}

module.exports = {
    sendCodeWhatsApp
}
