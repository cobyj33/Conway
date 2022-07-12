export abstract class EditMode {
    subModes: EditMode[];
    cursorString: string;

    constructor(cursorString: string, subModes: EditMode[]) {
        this.cursorString = cursorString;
        this.subModes = subModes;
    }
}

interface KeyEvents {
    onKeyDown(): void;
    onKeyUp(): void;
}

interface PointerEvents {
    onPointerMove(): void;
    onPointerEnter(): void;
    onPointerLeave(): void;
}