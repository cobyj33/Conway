export class BoardSettings {
    tickSpeed: number
    randomizeAmount: number
    isScreenFit: boolean

    constructor(tickSpeed: number, randomizeAmount: number, isScreenFit: boolean) {
        this.tickSpeed = tickSpeed;
        this.randomizeAmount = randomizeAmount;
        this.isScreenFit = isScreenFit;
    }

    static getDefault(): BoardSettings {
        return new BoardSettings(5, 10, false);
    }
}