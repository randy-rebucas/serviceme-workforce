import { Offers } from '../offers/offers';

export class Bookings {
    constructor(
        public offers: [Offers],
        public charges: number,
        public scheduleDate: Date,
        public scheduleTime: Date,
        public status: string,
        public id?: string,
    ) {}
}
