export class Playback {
    enabled: boolean;
    paused: boolean;
    currentGeneration: number;

    constructor(enabled: boolean = false, paused: boolean = false, currentGeneration: number = 1) {
        this.enabled = enabled;
        this.paused = paused;
        this.currentGeneration = currentGeneration;
    }   
}