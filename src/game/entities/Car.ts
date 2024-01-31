import { Sprite } from "pixi.js";
import { Game } from "..";
import { TrackSystem } from "../systems/TrackSystem";

interface Car {
    offset: number;
    z: number;
    speed: number;
}

export default class CarEntity extends Sprite implements Car
{
    private _game: Game;
    private _z: number;
    private _offset: number;
    private _speed: number = 0;
    private _percent: number = 0;
    private _spriteNum: string = "";

    constructor(spriteNum: string, game: Game, z: number, offset: number)
    {
        super(game.sheet?.textures[`car-${spriteNum}-straight`]);
        this._game = game;
        this._z = z;
        this._offset = offset;
        this._spriteNum = spriteNum;
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

        
        return (1.3 * track.segmentLength) / (1 / 60);
    }

    get accel()
    {
        return this.maxSpeed / 5;
    }

    get spriteNum()
    {
        return this._spriteNum;
    }
}