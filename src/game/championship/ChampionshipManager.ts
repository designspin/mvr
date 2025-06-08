import { Driver, DRIVER_ROSTER } from './Driver';

export interface Race {
    id: string;
    trackName: string;
    trackFile: string;
    completed: boolean;
    results?: RaceResult[];
}

export interface RaceResult {
    driverId: string;
    position: number;
    lapTime: number;
    bestLapTime: number;
    points: number;
}

export interface Championship {
    id: string;
    name: string;
    season: number;
    currentRaceIndex: number;
    races: Race[];
    isComplete: boolean;
}

export class ChampionshipManager {
    private static instance: ChampionshipManager;
    private _currentChampionship: Championship | null = null;
    private readonly POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    private constructor() {}

    public static getInstance(): ChampionshipManager {
        if (!ChampionshipManager.instance) {
            ChampionshipManager.instance = new ChampionshipManager();
        }
        return ChampionshipManager.instance;
    }

    public createNewChampionship(season: number = 1): Championship {
        const championship: Championship = {
            id: `season-${season}`,
            name: `Season ${season} Championship`,
            season,
            currentRaceIndex: 0,
            isComplete: false,
            races: [
                { id: 'race-1', trackName: 'Test Track 1', trackFile: 'track1.json', completed: false },
                { id: 'race-2', trackName: 'Test Track 2', trackFile: 'track2.json', completed: false },
                { id: 'race-3', trackName: 'Test Track 3', trackFile: 'track3.json', completed: false },
                { id: 'race-4', trackName: 'Test Track 4', trackFile: 'track4.json', completed: false },
                { id: 'race-5', trackName: 'Test Track 5', trackFile: 'track5.json', completed: false },
                { id: 'race-6', trackName: 'Test Track 6', trackFile: 'track6.json', completed: false }
            ]
        };

        DRIVER_ROSTER.forEach(driver => {
            driver.championshipPoints = 0;
            driver.raceWins = 0;
            driver.podiums = 0;
        });

        this._currentChampionship = championship;
        return championship;
    }

    public getCurrentChampionship(): Championship | null {
        return this._currentChampionship;
    }

    public getCurrentRace(): Race | null {
        if (!this._currentChampionship) return null;
        
        const race = this._currentChampionship.races[this._currentChampionship.currentRaceIndex];
        return race || null;
    }

    public getNextRace(): Race | null {
        if (!this._currentChampionship) return null;
        
        const nextIndex = this._currentChampionship.currentRaceIndex + 1;
        return this._currentChampionship.races[nextIndex] || null;
    }

    public completeRace(results: { driverId: string; position: number; lapTime: number; bestLapTime: number }[]): void {
        if (!this._currentChampionship) return;

        const currentRace = this.getCurrentRace();
        if (!currentRace) return;

        const raceResults: RaceResult[] = results.map(result => ({
            ...result,
            points: this.POINTS_TABLE[result.position - 1] || 0
        }));

        currentRace.completed = true;
        currentRace.results = raceResults;

        raceResults.forEach(result => {
            const driver = DRIVER_ROSTER.find(d => d.id === result.driverId);
            if (driver) {
                driver.championshipPoints += result.points;
                
                if (result.position === 1) {
                    driver.raceWins++;
                    driver.podiums++;
                } else if (result.position <= 3) {
                    driver.podiums++;
                }

                if (!driver.bestLapTime || result.bestLapTime < driver.bestLapTime) {
                    driver.bestLapTime = result.bestLapTime;
                }
            }
        });

        this._currentChampionship.currentRaceIndex++;

        if (this._currentChampionship.currentRaceIndex >= this._currentChampionship.races.length) {
            this._currentChampionship.isComplete = true;
        }
    }

    public getChampionshipStandings(): Driver[] {
        return [...DRIVER_ROSTER].sort((a, b) => {
            if (b.championshipPoints !== a.championshipPoints) {
                return b.championshipPoints - a.championshipPoints;
            }
            
            if (b.raceWins !== a.raceWins) {
                return b.raceWins - a.raceWins;
            }
            
            if (b.podiums !== a.podiums) {
                return b.podiums - a.podiums;
            }
            
            if (a.bestLapTime === null && b.bestLapTime === null) return 0;
            if (a.bestLapTime === null) return 1;
            if (b.bestLapTime === null) return -1;
            return a.bestLapTime - b.bestLapTime;
        });
    }

    public getPlayerPosition(): number {
        const standings = this.getChampionshipStandings();
        return standings.findIndex(driver => driver.id === 'player') + 1;
    }

    public isChampionshipComplete(): boolean {
        return this._currentChampionship?.isComplete || false;
    }

    public getChampionshipProgress(): { completed: number; total: number } {
        if (!this._currentChampionship) return { completed: 0, total: 0 };
        
        const completed = this._currentChampionship.races.filter(race => race.completed).length;
        const total = this._currentChampionship.races.length;
        
        return { completed, total };
    }

    public getLastRaceResults(): any {
        if (!this._currentChampionship) return null;
        
        const completedRaces = this._currentChampionship.races.filter(race => race.completed);
        if (completedRaces.length === 0) return null;
        
        const lastRace = completedRaces[completedRaces.length - 1];
        if (!lastRace.results) return null;
        
        return {
            trackName: lastRace.trackName,
            results: lastRace.results.map(result => ({
                driverId: result.driverId,
                driverName: DRIVER_ROSTER.find(d => d.id === result.driverId)?.name || 'Unknown',
                position: result.position,
                points: result.points,
                lapTime: result.lapTime,
                bestLapTime: result.bestLapTime,
                isPlayer: result.driverId === 'player'
            }))
        };
    }

    public saveChampionship(): string {
        return JSON.stringify({
            championship: this._currentChampionship,
            drivers: DRIVER_ROSTER
        });
    }

    public loadChampionship(data: string): void {
        try {
            const parsed = JSON.parse(data);
            this._currentChampionship = parsed.championship;
            
            parsed.drivers.forEach((savedDriver: Driver) => {
                const driver = DRIVER_ROSTER.find(d => d.id === savedDriver.id);
                if (driver) {
                    Object.assign(driver, savedDriver);
                }
            });
        } catch (error) {
            console.error('Failed to load championship data:', error);
        }
    }
}
