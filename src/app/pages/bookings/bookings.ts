import { Offers } from '../offers/offers';

export class Bookings {
    constructor(
        public offers: [Offers],
        public id?: string,
    ) {}
}
