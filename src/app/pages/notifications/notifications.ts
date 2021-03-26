export class Notifications {
    constructor(
        public content: string,
        public status: string,
        public timestamp: Date,
        public type: string,
        public id?: string
    ) {}
}
