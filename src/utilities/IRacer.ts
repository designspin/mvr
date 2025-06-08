import { ISegment } from "./graphicsHelpers";
import { Texture } from "pixi.js";

export interface IRacer {
    offset: number;
    z: number;
    speed: number;
    maxSpeed: number;
    lap: number;
    racePosition: number;
    segment?: ISegment;
    totalRaceDistance: number;

    adjustSpeedMultiplier?(factor: number): void;

    spriteNum?: string;
    percent: number;
    displayScale?: number;
    texture?: Texture;

    aiProfile?: any;
    competingWith?: IRacer | null;
    draftingTarget?: IRacer | null;
    defendingPosition?: boolean;
    aggressiveness?: number;

    shouldOvertake?(competitor: IRacer, distance: number): boolean;
    shouldDefendAgainst?(competitor: IRacer, distance: number): boolean;
    getCorneringSpeed?(curveIntensity: number): number;
    adjustRacingLineForCorner?(cornerDirection: number): number;
    adjustSpeedForRacePosition?(leaderPosition: number): number;
}