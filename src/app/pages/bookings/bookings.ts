import { Offers } from '../offers/offers';

export interface Coordinates {
    lat: number;
    lng: number;
}

export class Bookings {
    constructor(
        public offers: [Offers],
        public professionalId: string,
        public clientId: string,
        public location: string,
        public coordinates: Coordinates,
        public charges: number,
        public scheduleDate: Date,
        public scheduleTime: Date,
        public notes: string,
        public status: string,
        public id?: string,
    ) {}
}
