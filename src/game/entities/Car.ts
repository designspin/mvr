import { Sprite } from "pixi.js";
import { Game } from "..";
import { TrackSystem } from "../systems/TrackSystem";
import { ISegment } from "../../utilities";
import { IRacer } from "../../utilities/IRacer";
import { Driver, getDriverByCarNumber, getAIDrivers } from "../championship/Driver";



interface AIProfile {
    cornerSpeedFactor: number;
    accelerationBoost: number;
    brakingDistance: number;
    overtakingEagerness: number;
    defensiveness: number;
    competitiveness: number;
}

const AI_PROFILES: Record<string, AIProfile> = {
    AGGRESSIVE: {
        cornerSpeedFactor: 0.85,
        accelerationBoost: 1.3,
        brakingDistance: 0.6,
        overtakingEagerness: 1.4,
        defensiveness: 1.5,
        competitiveness: 1.5
    },
    BALANCED: {
        cornerSpeedFactor: 0.7,
        accelerationBoost: 1.0,
        brakingDistance: 1.0,
        overtakingEagerness: 1.0,
        defensiveness: 1.0,
        competitiveness: 1.0
    },
    CAUTIOUS: {
        cornerSpeedFactor: 0.6,
        accelerationBoost: 0.8,
        brakingDistance: 1.4,
        overtakingEagerness: 0.7,
        defensiveness: 0.6,
        competitiveness: 0.7
    }
}

interface Car extends IRacer {
    previousSegment?: ISegment;
}

export default class CarEntity extends Sprite implements Car
{
    private _game: Game;
    private _z: number;
    private _offset: number;
    private _speed: number = 0;
    private _targetSpeed: number = 0;
    private _percent: number = 0;
    private _spriteNum: string = "";
    private _speedMultiplier: number = 1;
    private _lap: number = -1;
    private _racePosition: number = 0;

    private _aiProfile: AIProfile | null = null;
    private _draftingTarget: CarEntity | null = null;
    private _defendingPosition: boolean = false;
    private _competingWith: Car | null = null;
    private _racingLine: number = 0;

    public targetSteeringState: number = 0; 
    public currentSteeringState: number = 0;
    public readonly STEERING_SMOOTHING = 0.2;

    public framesSinceDirectionChange: number = 0;
    public lastAvoidanceDirection: number = 0; 
    public totalRaceDistance: number = 0;
    
    public driver: Driver | null = null;

    constructor(spriteNum: string, game: Game, z: number, offset: number, aiCarIndex?: number)
    {
        super(game.sheet?.textures[`car-${spriteNum}-straight`]);
        this._game = game;
        this._z = z;
        this._offset = offset;
        this._spriteNum = spriteNum;

        if (aiCarIndex !== undefined) {
            const aiDrivers = getAIDrivers();
            this.driver = aiDrivers[aiCarIndex % aiDrivers.length] || null;
        } else {
            this.driver = getDriverByCarNumber(spriteNum) || null;
        }

        const baseSpeed = 50;
        const minSpeed = baseSpeed * 0.95;
        const maxSpeed = baseSpeed * 1.2;
        this._speedMultiplier = Math.random() * (maxSpeed - minSpeed) + minSpeed;
    }

    adjustSpeedMultiplier(factor: number): void {
        this._speedMultiplier *= factor;
    }

    get aiProfile(): AIProfile
    {
        if(!this._aiProfile) {
            if(this._spriteNum.includes("2")) {
                this._aiProfile = AI_PROFILES.AGGRESSIVE;
            } else if(this._spriteNum.includes("3")) {
                this._aiProfile = AI_PROFILES.BALANCED;
            } else {
                this._aiProfile = AI_PROFILES.CAUTIOUS;
            }

            this._racingLine = (Math.random() * 0.4) - 0.2;
        }

        return this._aiProfile;
    }
    
    public shouldDefendAgainst(competitor: Car, distance: number): boolean {
        return competitor.racePosition == this._racePosition + 1 && 
               distance < 10 && 
               Math.random() < 0.05 * this.aiProfile.defensiveness;
    }
    
    public shouldOvertake(competitor: Car, distance: number): boolean {
        const positionDiff = this._racePosition - competitor.racePosition;
        const isCompetitorAhead = positionDiff > 0 && positionDiff < 3;
        
        return isCompetitorAhead && 
               distance < 8 && 
               this.speed > competitor.speed * 0.9 &&
               Math.random() < 0.03 * this.aiProfile.overtakingEagerness;
    }
    
    public adjustSpeedForRacePosition(_: number): number {
        const positionFactor = Math.max(0, 5 - this._racePosition) / 5;
        const competitiveFactor = this.aiProfile.competitiveness;
        
        const boost = 1 + (0.03 * positionFactor * competitiveFactor);
        return this.maxSpeed * boost;
    }
    
    public getCorneringSpeed(curveIntensity: number): number {
        const baseFactor = this.aiProfile.cornerSpeedFactor;
        
        if (this._competingWith && Math.random() < this.aiProfile.competitiveness * 0.5) {
            return this.maxSpeed * Math.max(0.25, 1 - curveIntensity * (2.2 - baseFactor));
        }
        
        return this.maxSpeed * Math.max(0.2, 1 - curveIntensity * (2.8 - baseFactor));
    }
    
    public adjustRacingLineForCorner(cornerDirection: number): number {
        const insideLine = cornerDirection > 0 ? -0.7 : 0.7;
        const moveAmount = 0.02 * this.aiProfile.cornerSpeedFactor;
        
        return this.offset > insideLine ? -moveAmount : moveAmount;
    }

    set draftingTarget(car: CarEntity | null) {
        this._draftingTarget = car;
    }
    
    get draftingTarget(): CarEntity | null {
        return this._draftingTarget;
    }
    
    set competingWith(car: Car | null) {
        this._competingWith = car;
    }
    
    get competingWith(): Car | null {
        return this._competingWith;
    }
    
    set defendingPosition(value: boolean) {
        this._defendingPosition = value;
    }
    
    get defendingPosition(): boolean {
        return this._defendingPosition;
    }

    get boostedAccel(): number {
        return this.accel * (this.aiProfile?.accelerationBoost || 1.0);
    }

    set racePosition(position: number)
    {
        this._racePosition = position;
    }

    get racePosition()
    {
        return this._racePosition
    }

    get offset()
    {
        return this._offset;
    }

    set offset(offset: number)
    {
        this._offset = offset;
    }

    get z()
    {
        return this._z;
    }

    set z(z: number)
    {
        this._z = z;
    }

    get speed()
    {
        return this._speed;
    }

    set speed(speed: number)
    {
        this._speed = speed;
    }

    get targetSpeed(): number {
        return this._targetSpeed;
    }
    
    set targetSpeed(speed: number) {
        this._targetSpeed = speed;
    }

    get lap()
    {
        return this._lap;
    }

    set lap(lap: number)
    {
        this._lap = lap;
    }

    get percent()
    {
        return this._percent;
    }

    set percent(percent: number)
    {
        this._percent = percent;
    }
    
    get displayScale()
    {
        return 0.4 * (1 / this.texture?.width);
    }

    get maxSpeed()
    {
        const track = this._game.systems.get(TrackSystem);
        return (this._speedMultiplier * track.segmentLength);
    }

    get accel()
    {
        return 1.5 * (this.maxSpeed / 5);
    }

    get breaking()
    {
        return -this.maxSpeed;
    }

    get decel()
    {
        return -this.maxSpeed / 5;
    }

    get spriteNum()
    {
        return this._spriteNum;
    }

    get racingLine(): number {
        return this._racingLine;
    }
}