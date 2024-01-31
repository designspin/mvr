import type { Game } from "./index";

export interface SystemState<S = System>{
    
    update: (ctx: S, dt: number) => void;
    doAction: (context: S) => void;
}

export interface SystemStateMachine<S = System> {
    setState: (state: SystemState<S>) => void;
    getState: () => SystemState<S>;
    switchState: () => void;
}

export interface System<S extends Game = Game> {
    game?: S;
    init?: () => void;
    awake?: () => void;
    start?: () => void;
    end?: () => void;
    reset?: () => void;
    update?: (deltaTime: number) => void;
}

interface SystemClass<GAME extends Game = Game, SYSTEM extends System<GAME> = System<GAME>> {
    SYSTEM_ID: string;
    new (): SYSTEM;
}

export class SystemRunner
{
    private readonly _game: Game;
    public readonly allSystems: Map<string, System> = new Map();
    
    constructor(game: Game)
    {
        this._game = game;
    }

    public add<S extends System>(Class: SystemClass<Game, S>): S
    {
        const name = Class.SYSTEM_ID;

        if(!name) throw new Error('[SystemManager] cannot add a system without name');

        if(this.allSystems.has(name))
        {
            return this.allSystems.get(name) as S;
        }

        const system = new Class();

        system.game = this._game;

        this.allSystems.set(Class.SYSTEM_ID, system);

        return system;
    }

    // Might be useful to remove systems
    public remove<S extends System>(Class: SystemClass<Game, S>): void
    {
        const name = Class.SYSTEM_ID;

        if(!name) throw new Error('[SystemManager] cannot remove a system without name');

        if(!this.allSystems.has(name))
        {
            return;
        }

        const system = this.allSystems.get(name) as S;

        system.game = undefined;

        this.allSystems.delete(name);
    }

    public get<S extends System>(Class: SystemClass<Game, S>): S
    {
        return this.allSystems.get(Class.SYSTEM_ID) as S;
    }

    public init()
    {
        this.allSystems.forEach((system) => system.init?.());
    }

    public awake()
    {
        this.allSystems.forEach((system) => system.awake?.());
    }

    public start()
    {
        this.allSystems.forEach((system) => system.start?.());
    }

    public update(deltaTime: number)
    {
        this.allSystems.forEach((system) => system.update?.(deltaTime));
    }

    public end()
    {
        this.allSystems.forEach((system) => system.end?.());
    }

    public reset()
    {
        this.allSystems.forEach((system) => system.reset?.());
    }
}

