import { Sprite } from "pixi.js";
import { Game } from "..";
import { TrackSystem } from "../systems/TrackSystem";
import { ISegment } from "../../utilities";

interface Car {
    offset: number;
    z: number;
    speed: number;
    lap: number;
    previousSegment?: ISegment;
}

export default class CarEntity extends Sprite implements Car
{
    private _game: Game;
    private _z: number;
    private _offset: number;
    private _speed: number = 0;
    private _percent: number = 0;
    private _spriteNum: string = "";
    private _speedMultiplier: number = 1;
    private _lap: number = 0;
    private _racePosition: number = 0;

    constructor(spriteNum: string, game: Game, z: number, offset: number)
    {
        super(game.sheet?.textures[`car-${spriteNum}-straight`]);
        this._game = game;
        this._z = z;
        this._offset = offset;
        this._spriteNum = spriteNum;

        const baseSpeed = 1.5;
        const minSpeed = baseSpeed * 0.25;
        const maxSpeed = baseSpeed * 1.2;
        this._speedMultiplier = Math.random() * (maxSpeed - minSpeed) + minSpeed;
    }

    get racePosition()
    {
        return this._racePosition
    }

    set racePosition(position: number)
    {
        this._racePosition = position;
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
        return (this._speedMultiplier * track.segmentLength) / (1 / 60);
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
}