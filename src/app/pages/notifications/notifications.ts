export class Notifications {
    constructor(
        public title: string,
        public content: string,
        public status: string,
        public timestamp: any,
        public type: string,
        public id?: string
    ) {}
}
