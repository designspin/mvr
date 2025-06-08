const LOOK_AHEAD = 20;

const ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 },
};


export const gameConfig = {
    lookAhead: LOOK_AHEAD,
    trackData: {
        level1: {
            roadWidth: 1200,
            segLength: 200,
            rumbleLength: 4,
            lanes: 3,
            track: [
                { func: "addStraight", params: [ROAD.LENGTH.LONG] },
                { func: "addCurve", params: [ROAD.LENGTH.LONG, ROAD.CURVE.HARD] },
                { func: "addStraight", params: [ROAD.LENGTH.LONG] },
                { func: "addCurve", params: [ROAD.LENGTH.LONG, ROAD.CURVE.HARD] },
                { func: "addStraight", params: [ROAD.LENGTH.LONG] },
                { func: "addCurve", params: [ROAD.LENGTH.LONG, ROAD.CURVE.HARD] },
                { func: "addStraight", params: [ROAD.LENGTH.LONG] },
                { func: "addCurve", params: [ROAD.LENGTH.LONG, ROAD.CURVE.HARD] },
                { func: "addStraight", params: [ROAD.LENGTH.SHORT]},
                { func: "addLowRollingHills" },
                { func: "addSCurves" },
                { func: "addCurve", params: [ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW] },
                { func: "addBumps" },
                { func: "addLowRollingHills" },
                { func: "addCurve", params: [ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM] },
                { func: "addStraight" },
                { func: "addHill", params: [ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH] },
                { func: "addSCurves" },
                { func: "addCurve", params: [ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE]},
                { func: "addHill", params: [ROAD.LENGTH.LONG, ROAD.HILL.HIGH] },
                { func: "addCurve", params: [ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW]},
                { func: "addBumps" },
                { func: "addHill", params: [ROAD.LENGTH.LONG, ROAD.HILL.MEDIUM]},
                { func: "addStraight" },
                { func: "addSCurves" },
                { func: "addDownhillToEnd" }
            ]
        }
    }
};

