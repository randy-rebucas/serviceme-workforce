export class Transactions {
    constructor(
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

export class MyTransactions extends Transactions{

    constructor(
        public amount: number,
        public currency: string,
        public description: string,
        public timestamp: Date,
        public ref: string,
        public status: string,
        public balance: number,
        public type?: string,
        public id?: string,
    ) {
        super(amount, currency, description, timestamp, ref, status, type, id);
    }
}
