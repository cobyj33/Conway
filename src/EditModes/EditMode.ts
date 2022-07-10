export abstract class EditMode {
    subModes: EditMode[];
    cursorString: string;

    constructor(cursorString: string, subModes: EditMode[]) {
        this.cursorString = cursorString;
        this.subModes = subModes;
    }

    onPointerMove() { }
    onPointerUp() { }
    onPointerDown() { }
    onPointerEnter() { }
    onPointerLeave() { }
    onKeyDown() { }
    onKeyUp() { }
    onDoubleClick() { }
}