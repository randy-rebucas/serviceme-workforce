import { Offers } from '../offers/offers';

export class Bookings {
    constructor(
        public offers: [Offers],
        public professionalId: string,
        public clientId: string,
        public location: string,
        public charges: number,
        public scheduleDate: Date,
        public scheduleTime: Date,
        public notes: string,
        public status: string,
        public id?: string,
    ) {}
}
