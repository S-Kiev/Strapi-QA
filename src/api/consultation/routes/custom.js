module.exports = {
    routes : [
        {
            method : 'POST',
            path : '/botCreate',
            handler: 'consultation.botCreate',
            config : {
                auth : false
            }
        },
        {
            method : 'PUT',
            path : '/botUpdate',
            handler: 'consultation.botUpdate',
            config : {
                auth : false
            }
        }
    ]
}