export interface Entries {
    account: string;
    debit: number;
    credit: number;
}

export class Transactions {
    constructor(
        public userId: string,
        public refference: string,
        public transactionDate: any,
        public description: string,
        public entries: [Entries],
        public id?: string
    ) {}
}
