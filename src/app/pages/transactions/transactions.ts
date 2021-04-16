export class Transactions {
    constructor(
        public sender: string,
        public receiver: string,
        public amount: number,
        public currency: string,
        public description: string,
        public timestamp: any,
        public refference: string,
        public status: string,
        public type: string,
        public id?: string
    ) {}
}