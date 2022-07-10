import { average, getSortedSelections } from "../functions"
import { Selection } from "./Selection"

let patternCount = 0;
const getPatternID = () => `Pattern #${patternCount++}`

export class Pattern {
    name: string;
    readonly id: string;
    description: string;
    selections: Selection[];

    //TODO: Make sure that selection JSON data can pass here
    constructor({ selections = [], name = getPatternID(), creator = "Jacoby", description = " A Pattern ", dateCreated = new Date(), lastModified = new Date() }:
    { selections?: Selection[], name?: string, creator?: string, description?: string, dateCreated?: Date, lastModified?: Date  }) {
        this.name = name;
        this.id = name.startsWith("Pattern #") ? name : getPatternID()
        // this.creator = creator;
        this.description = description;
        // this.dateCreated = dateCreated
        // this.lastModified = lastModified


        if (selections.length == 0) {
            this.selections = [];
        } else {
            const averageVerticalDistanceToCenter = Math.round(average(selections.map(cell => cell.row)))
            const averageHorizontalDistanceToCenter = Math.round(average(selections.map(cell => cell.col)))
            // this.selections = [];
            this.selections = getSortedSelections(selections.map(cell => new Selection(cell.row - averageVerticalDistanceToCenter, cell.col - averageHorizontalDistanceToCenter, cell?.isSelected)))
        }
    }

    get count() {
        return this.selections.length;
    }
}