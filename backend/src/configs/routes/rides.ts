export default class RideRoutes {
    static BASE_PATH: string = "/rides"
    static CREATE_RIDE: string = '/'
    static JOIN_RIDE: string = '/join'
    static ADD_STOP: string = '/stops'
    static GET_STOPS: string = '/:rideId/stops'
    static DELETE_STOP: string = '/stops/:stopId'
}
