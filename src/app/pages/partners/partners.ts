import { Coordinates } from '../bookings/bookings';

export interface Name {
    firstname: string;
    middlename: string;
    lastname: string;
}

export interface Address {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: Coordinates;
}

export class Partners {
    constructor(
        public name: Name,
        public address: Address,
        public created: Date,
        public status: string,
        public id?: string
    ) {}
}
