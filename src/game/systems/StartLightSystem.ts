import { Game } from "../";
import { System } from "../SystemRunner";

export class StartLightSystem implements System
{
    public static SYSTEM_ID = 'start-lights';
    public game!: Game;
    
    public init()
    {

    }

    public update(_dt:number)
    {

    }
}