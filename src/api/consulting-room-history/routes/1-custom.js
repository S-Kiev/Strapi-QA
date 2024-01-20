console.log('Rutas personalizada de consulting-room-history cargadas correctamente.');

module.exports = {
    routes: [
        {
            method: "DELETE",
            path: "/consultingRoomHistory/simpleDeleteConsultingRoomHistory",
            handler: "consulting-room-history.simpleDeleteConsultingRoomHistory",
            config: {
                policies: [],
                midelleware: []
            },
        }
    ]
}