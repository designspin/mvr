export interface Driver {
    id: string;
    name: string;
    carNumber: string; 
    aiProfile: 'AGGRESSIVE' | 'BALANCED' | 'CAUTIOUS';
    nationality: string;
    team: string;
    
    championshipPoints: number;
    raceWins: number;
    podiums: number;
    bestLapTime: number | null;
}

export const DRIVER_ROSTER: Driver[] = [
    {
        id: 'player',
        name: 'Player',
        carNumber: '01',
        aiProfile: 'BALANCED',
        nationality: 'Unknown',
        team: 'Player Team',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'lightning-rodriguez',
        name: 'Lightning Rodriguez',
        carNumber: '02',
        aiProfile: 'AGGRESSIVE',
        nationality: 'Spain',
        team: 'Thunder Racing',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'speed-demon-smith',
        name: 'Speed Demon Smith',
        carNumber: '03',
        aiProfile: 'AGGRESSIVE',
        nationality: 'USA',
        team: 'Velocity Motors',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'cautious-kate',
        name: 'Cautious Kate',
        carNumber: '04',
        aiProfile: 'CAUTIOUS',
        nationality: 'Canada',
        team: 'Precision Racing',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'balanced-bob',
        name: 'Balanced Bob',
        carNumber: '05',
        aiProfile: 'BALANCED',
        nationality: 'UK',
        team: 'Steady Wheels',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'turbo-tina',
        name: 'Turbo Tina',
        carNumber: '06',
        aiProfile: 'AGGRESSIVE',
        nationality: 'Germany',
        team: 'Speed Storm',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'steady-steve',
        name: 'Steady Steve',
        carNumber: '07',
        aiProfile: 'BALANCED',
        nationality: 'Australia',
        team: 'Reliable Racing',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'fearless-franco',
        name: 'Fearless Franco',
        carNumber: '08',
        aiProfile: 'AGGRESSIVE',
        nationality: 'Italy',
        team: 'Daredevil Drivers',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'careful-carlos',
        name: 'Careful Carlos',
        carNumber: '09',
        aiProfile: 'CAUTIOUS',
        nationality: 'Mexico',
        team: 'Safe Speed',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'rapid-rick',
        name: 'Rapid Rick',
        carNumber: '10',
        aiProfile: 'BALANCED',
        nationality: 'Brazil',
        team: 'Quick Motors',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'smooth-sarah',
        name: 'Smooth Sarah',
        carNumber: '11',
        aiProfile: 'BALANCED',
        nationality: 'France',
        team: 'Elegant Racing',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    },
    {
        id: 'wild-wesley',
        name: 'Wild Wesley',
        carNumber: '12',
        aiProfile: 'AGGRESSIVE',
        nationality: 'South Africa',
        team: 'Chaos Racing',
        championshipPoints: 0,
        raceWins: 0,
        podiums: 0,
        bestLapTime: null
    }
];

export function getDriverById(id: string): Driver | undefined {
    return DRIVER_ROSTER.find(driver => driver.id === id);
}

export function getDriverByCarNumber(carNumber: string): Driver | undefined {
    return DRIVER_ROSTER.find(driver => driver.carNumber === carNumber);
}

export function getPlayerDriver(): Driver {
    return DRIVER_ROSTER.find(driver => driver.id === 'player')!;
}

export function getAIDrivers(): Driver[] {
    return DRIVER_ROSTER.filter(driver => driver.id !== 'player');
}
