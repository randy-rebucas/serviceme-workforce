export interface Message {
    createdAt: any;
    from: string;
    message: string;
    type?: string;
    id?: string;
}

export class Chats {
    constructor(
        public createdBy?: string,
        public createdAt?: any,
        public members?: any,
        public recentMessage?: string,
        public name?: string,
        public id?: string,
    ) {}
}
