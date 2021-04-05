import { Coordinates } from '../bookings/bookings';

export interface Name {
    firstname: string;
    lastname: string;
    midlename: string;
}

export interface Address {
    city: string;
    country: string;
    state: string;
    address1?: string;
    address2?: string;
    postalCode?: string;
    coordinates?: Coordinates;
}

export class Users {
    constructor(
        public name: Name,
        public address: Address,
        public gender: string,
        public classification?: string,
        public availability?: any,
        public id?: string
    ) {}
}
