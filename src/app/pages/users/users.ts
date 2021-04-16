import { Coordinates } from '../bookings/bookings';

export interface Name {
    firstname: string;
    lastname: string;
    midlename: string;
}

export interface Address {
    city?: string;
    country?: string;
    state?: string;
    address1?: string;
    address2?: string;
    postalCode?: string;
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
        public address?: Address,
        public gender?: string,
        public birthdate?: any,
        public phoneNumber?: string,
        public displayName?: string,
        public photoURL?: string,
        public id?: string
    ) {}
}
