import { Game } from "..";
import { System } from "../SystemRunner";

class SoundSystem implements System
{
    public static SYSTEM_ID = 'sound';
    public game!: Game;

    public init()
    {
        
    }

    public update(_dt:number)
    {
    }
}

export default SoundSystem;