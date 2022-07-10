import { Coordinates } from "./Coordinates";

export class View {
    coordinates: Coordinates;
    zoom: number;

    constructor(coordinates: Coordinates, zoom: number) {
        this.coordinates = coordinates;
        this.zoom = zoom;
    }
}