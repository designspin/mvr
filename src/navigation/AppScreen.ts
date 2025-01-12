import { Container, Ticker } from "pixi.js";

export interface AppScreen<T = any> extends Container {
    prepare?: (data?: T) => void;
    show?: () => void;
    hide?: () => void;
    update?: (time: Ticker) => void;
}