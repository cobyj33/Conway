import { getNextGeneration } from "../functions";


export class Renders {
    starters: Set<string>;
    frames: { [key: string]: string };

    constructor(starters: string[] = [], frames: { [key: string]: string } = {}) {
        this.frames = frames;
        this.starters = new Set<string>(starters);
    }

    isCycled(startingSelectionsJSON: string): boolean {
      let currentString: string = startingSelectionsJSON
      const passedThrough: Set<string> = new Set<string>([])

      while (!passedThrough.has(currentString) && ( currentString in this.frames ) ) {
        passedThrough.add(currentString)
        currentString = this.frames[currentString]
      }

      return passedThrough.has(currentString)
    }

    generationCount(startingSelectionsJSON: string): number {
      let count: number = 0;
      let currentString: string = startingSelectionsJSON
      const passedThrough: Set<string> = new Set<string>([])

      while (!passedThrough.has(currentString) && ( currentString in this.frames ) ) {
        passedThrough.add(currentString)
        currentString = this.frames[currentString]
        count++;
      }

      if (passedThrough.has(currentString))
        return Infinity;
      return count;
    }

    getFrames(startingSelectionsJSON: string): string[] {
      const frames: string[] = []
      let currentString: string = startingSelectionsJSON
      const passedThrough: Set<string> = new Set([])

      while (!passedThrough.has(currentString) && ( currentString in this.frames ) ) {
        passedThrough.add(currentString)
        frames.push(currentString)
        currentString = this.frames[currentString]
      }

      return frames;
    }

    getLastRenderedFrame(startingSelectionsJSON: string): string {
      let currentString: string = startingSelectionsJSON
      const passedThrough: Set<string> = new Set<string>([])
      while (!passedThrough.has(currentString) && ( currentString in this.frames ) ) {
        passedThrough.add(currentString)
        currentString = this.frames[currentString]
      }
      return currentString;
    }

    getStarters(): string[] {
        return [...this.starters.values()]
    }

    addStarter(startingSelectionsJSON: string): void {
        this.starters.add(startingSelectionsJSON)
    }

    render(startingSelectionsJSON: string, generations: number = 0): void {
      console.log("generations: ", generations)
      if (generations <= 0) {
        console.error("[App.render()] cannot render " + generations + " generations");
        return
      }
      
      let currentString: string = startingSelectionsJSON
      let currentGeneration: number = 0;
      if (this.starters.has(currentString)) {
        currentGeneration = this.generationCount(currentString);
        currentString = this.getLastRenderedFrame(currentString)
      } else {
        this.starters.add(startingSelectionsJSON)
      }
      

      while ( currentGeneration <= generations ) {
        if (currentString in this.frames) {
          currentString = this.frames[currentString]
        } else {
          this.frames[currentString] = JSON.stringify( getNextGeneration(JSON.parse(currentString)) )
          currentString = this.frames[currentString]
        }
        currentGeneration++
      }

      console.log("renders object: ", this)
    }

    hasNextFrame(currentFrameString: string): boolean {
      return currentFrameString in this.frames;
    }

    getNextFrame(currentFrameString: string): string {
      return this.frames[currentFrameString]
    }

    getRenderData(startingSelectionsJSON: string): { starter: string, frames: string[] } {
      return {
        starter: startingSelectionsJSON,
        frames: this.getFrames(startingSelectionsJSON)
      }
    }

    loadRenderData({starter, frames}: {starter: string, frames: string[]}): void {
      for (let currentFrame = 0; currentFrame < frames.length - 1; currentFrame++) {
        this.frames[frames[currentFrame]] = frames[currentFrame + 1]
      }

    //   if (!this.starters.some(selectionsJSON => selectionsJSON === starter)) {
    //     this.starters.add(starter)
    //   }
      this.starters.add(starter)
    }
  }