export class Offers {
    constructor(
        public title: string,
        public description: string,
        public category: string,
        public durations: number,
        public charges: number,
        public timestamp: any,
        public imageUrl?: string,
        public id?: string,
    ) {}
}
