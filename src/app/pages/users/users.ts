import { Coordinates } from '../bookings/bookings';

export interface Name {
    firstname: string;
    lastname: string;
    midlename: string;
}

export interface Address {
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: Coordinates;
}

export interface Roles {
    client?: boolean;
    pro?: boolean;
    admin?: boolean;
}

export class Users {
    constructor(
        public name: Name,
        public email: string,
        public roles: Roles,
        public gender?: string,
        public birthdate?: any,
        public address?: Address,
        public phoneNumber?: string,
        public displayName?: string,
        public photoURL?: string,
        public id?: string
    ) {}
}
