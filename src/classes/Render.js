

let renderID = 0;
export class Render {
    constructor(startingSelectionsJSON = "", frames = {}) {
      this.id = ++renderID;
      this.frames = frames
      this.startingSelectionsJSON = startingSelectionsJSON
    }

    get numOfFrames() {
      return Object.keys(this.frames).length
    }
 
  } 