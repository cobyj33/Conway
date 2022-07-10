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
            // console.log(event)
            this.runUp(event)
        }
    }
  }