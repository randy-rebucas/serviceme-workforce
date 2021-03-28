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

export interface Roles {
    pro?: boolean;
    client?: boolean;
    admin?: boolean;
}

export class Users {
    constructor(
        public name: Name,
        public address: Address,
        public gender: string,
        public roles: Roles,
        public classification?: string,
        public availability?: any,
        public id?: string
    ) {}
}
