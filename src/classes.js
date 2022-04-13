
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
        if (this.width == 0 || this.height == 0) return false
        
        return ((this.row <= row && this.row + this.height > row) || (row <= this.row && row + height > this.row)) && ((this.col <= col && this.col + this.width > col) || (col <= this.col && col + width > this.col))
    }
  }
  
  export class KeyBinding {
    constructor({key = 'any', onDown = () => console.log('key pressed'), onUp = () => console.log('key lifted'), onShift = false, onControl = false, onAlt = false}) {
        this.onDown = onDown;
        this.onUp = onUp
        this.key = key;
        this.onShift = key === 'Shift' ? true : onShift;
        this.onControl = key === 'Control' ? true : onControl;
        this.onAlt = key === 'Alt' ? true : onAlt;
    }
  
    testDown(event) {
        return event.type == 'keydown' && (event.key == this.key || this.key == 'any') && this.onShift == event.shiftKey && this.onControl == event.ctrlKey && this.onAlt == event.altKey
    }

    runDown(event) {
        this.onDown(event)
    }

    testAndRunDown(event) {
        if (this.testDown(event)) {
            this.runDown(event)
        }
    }

    testUp(event) {
        return event.type == 'keyup' && (event.key == this.key || this.key == 'any') 
         && (this.onShift ? this.onShift != event.shiftKey : this.onShift == event.shiftKey)
         && (this.onControl ? this.onControl != event.ctrlKey : this.onControl == event.ctrlKey)
         && (this.onAlt ? this.onAlt != event.altKey : this.onAlt == event.altKey)
    }

    runUp(event) {
        this.onUp(event)
    }
  
    testAndRunUp(event) {
        if (this.testUp(event)) {
            console.log(event)
            this.runUp(event)
        }
    }
  }