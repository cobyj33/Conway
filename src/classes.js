export class Selection {
    constructor(row, col) {
        this.row = row
        this.col = col
        this.isSelected = false;
    }
  }
  
  export class Area {
    constructor(row = 0, col = 0, width = 0, height = 0) {
        this.row = row;
        this.col = col;
        this.width = width;
        this.height = height
    }
    
    get rightSide() {
        return this.col + this.width
    }
  
    get bottomSide() {
        return this.row + this.height
    }
  
    get area() {
        return this.width * this.height
    }
  
    get info() {
        return [this.row, this.col, this.width, this.height]
    }
  
    containsArea({row, col, width = 1, height = 1}) {
        return ((this.row <= row && this.row + this.height > row) || (row <= this.row && row + height > this.row)) && ((this.col <= col && this.col + this.width > col) || (col <= this.col && col + width > this.col))
    }
  }
  
  export class KeyBinding {
    constructor({key = ' ', callback = () => console.log('key pressed'), onShift = false, onControl = false, onAlt = false}) {
        this.callback = callback;
        this.key = key;
        this.onShift = onShift;
        this.onControl = onControl;
        this.onAlt = onAlt;
    }
  
    test(event) {
        return event.key == this.key && this.onShift == event.shiftKey && this.onControl == event.ctrlKey && this.onAlt == event.altKey
    }
  
    testAndRun(event) {
        if (this.test(event)) {
            this.run(event)
        }
    }
  
    run(event) {
        this.callback(event)
    }
  }