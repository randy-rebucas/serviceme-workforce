export class Transactions {
    constructor(
        // public from: string,
        // public to: string,
        public amount: number,
        public currency: string,
        public description: string,
        public timestamp: Date,
        public ref: string,
        public status: string,
        public type?: string,
        public id?: string
    ) {}
}
