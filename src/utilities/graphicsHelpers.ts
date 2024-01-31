import { Graphics, IPointData } from "pixi.js";
import { TrackObject } from "../game/entities/TrackObject";
import { designConfig } from "../game";
import { isOdd } from ".";
import CarEntity from "../game/entities/Car";

interface IColors {
    SKY: number;
    TREE: number;
    FOG: number;
    LIGHT: SegmentColor;
    DARK: SegmentColor;
    START: SegmentColor;
    FINISH: SegmentColor;
}

export const COLORS: IColors = {
    SKY: 0x72d7ee,
    TREE: 0x005108,
    FOG: 0x005108,
    LIGHT: { road: 0x6b6b6b, grass: 0x319612, rumble: 0xd3d3d3, lane: 0xcccccc },
    DARK: { road: 0x696969, grass: 0x03cb816, rumble: 0x94120a },
    START: { road: 0x696969, grass: 0x3cb816, rumble: 0x94120a },
    FINISH: { road: 0x000000, grass: 0x000000, rumble: 0x000000 },
};

type TrackColorPosition = "road" | "grass" | "rumble";
type TrackColorPositionExt = TrackColorPosition | "lane";

type ISegmentColor = {
    [key in TrackColorPosition]: number;
};

type ISegmentColorExt = {
    [key in TrackColorPositionExt]: number;
};

type SegmentColor = number | ISegmentColor | ISegmentColorExt;

interface IVec extends IPointData
{
    z: number;
}

interface IScreen {
    x: number;
    y: number;
    width: number;
    scale: number;
}

export interface ISegmentPoint {
    world: IVec;
    camera: IVec;
    screen: IScreen;
}



export interface ISegment {
    index: number;
    p1: ISegmentPoint;
    p2: ISegmentPoint;
    color: SegmentColor;
    curve: number;
    clip?: number;
    looped?: boolean;
    fog?: number;
    sprites?: TrackObject[];
    cars?: CarEntity[];
    isStartLineSegment?: "odd" | "even";
    isStartPositionSegment?: boolean;
}

function polygon (ctx: Graphics, p1: IPointData, p2: IPointData, p3: IPointData, p4: IPointData, color: number)
{
    ctx.beginFill(color);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.endFill();
}

export function renderStartLineSegment(
    ctx: Graphics, 
    segA: ISegmentPoint,
    segB: ISegmentPoint,
    fog: number,
    color: SegmentColor,
    lanes: number,
    alt: "odd" | "even"
) {
    const r1 = rumbleWidth(segA.screen.width, lanes);
    const r2 = rumbleWidth(segB.screen.width, lanes);

    const A = segA.screen;
    const B = segB.screen;

    ctx.beginFill((color as ISegmentColor).grass);
    ctx.drawRect(0, B.y, designConfig.content.width, A.y - B.y);

    if((color as ISegmentColor).road) {
        const colorRoad = (color as ISegmentColor).road;

        polygon(
            ctx,
            { x: A.x - A.width, y: A.y},
            { x: A.x + A.width, y: A.y},
            { x: B.x + B.width, y: B.y},
            { x: B.x - B.width, y: B.y},
            colorRoad
        );
    }

    const block1 = (A.width * 2) / 10;
    const block2 = (B.width * 2) / 10;

    let blockx1 = A.x - A.width + block1;
    let blockx2 = B.x - B.width + block2;

    for(let block = 1; block < 10; blockx1 += block1, blockx2 += block2, block++)
    {
        polygon(
            ctx,
            { x: blockx1 - block1 / 2, y: A.y},
            { x: blockx1 + block1 / 2, y: A.y},
            { x: blockx2 + block2 / 2, y: B.y},
            { x: blockx2 - block2 / 2, y: B.y},
            alt === "even" ? 
                (block % 2 === 0 ? 0x000000 : 0xffffff) 
                : 
                (block % 2 === 0 ? 0xffffff : 0x000000)
        );
    }

    if((color as ISegmentColor).rumble)
    {
        const colorRumble = (color as ISegmentColor).rumble;
        
        polygon(
            ctx,
            { x: A.x - A.width - r1, y: A.y},
            { x: A.x - A.width, y: A.y},
            { x: B.x - B.width, y: B.y},
            { x: B.x - B.width - r2, y: B.y},
            colorRumble
        );
        polygon(
            ctx,
            { x: A.x + A.width + r1, y: A.y},
            { x: A.x + A.width, y: A.y},
            { x: B.x + B.width, y: B.y},
            { x: B.x + B.width + r2, y: B.y},
            colorRumble
        );
    }

    renderFog(ctx, fog, { x: 0, y: A.y }, { x: designConfig.content.width, y: B.y - A.y });
}

export function renderStartPositionSegment(
    ctx: Graphics,
    segA: ISegmentPoint,
    segB: ISegmentPoint,
    _fog: number,
    color: SegmentColor,
    lanes: number
) {
    const l1 = laneMarkerWidth(segA.screen.width, lanes);
    const l2 = laneMarkerWidth(segB.screen.width, lanes);
    const r1 = rumbleWidth(segA.screen.width, lanes);
    const r2 = rumbleWidth(segB.screen.width, lanes);

    const A = segA.screen;
    const B = segB.screen;

    ctx.beginFill((color as ISegmentColor).grass);
    ctx.drawRect(0, B.y, designConfig.content.width, A.y - B.y);

    if((color as ISegmentColor).road) {
        const colorRoad = (color as ISegmentColor).road;

        polygon(
            ctx,
            { x: A.x - A.width, y: A.y},
            { x: A.x + A.width, y: A.y},
            { x: B.x + B.width, y: B.y},
            { x: B.x - B.width, y: B.y},
            colorRoad
        );
    }

    if((color as ISegmentColorExt).lane) {
        const colorLane = (color as ISegmentColorExt).lane;

        const lanew1 = (A.width * 2) / lanes;
        const lanew2 = (B.width * 2) / lanes;

        let lanex1 = A.x - A.width + lanew1;
        let lanex2 = B.x - B.width + lanew2;

        for(let lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
        {
            polygon(
                ctx,
                { x: lanex1 - l1 / 2, y: A.y},
                { x: lanex1 + l1 / 2, y: A.y},
                { x: lanex2 + l2 / 2, y: B.y},
                { x: lanex2 - l2 / 2, y: B.y},
                colorLane
            );
        }
    }

    const startw1 = (A.width * 2) / lanes;
    const startw2 = (B.width * 2) / lanes;

    let startx1 = A.x - A.width + startw1;
    let startx2 = B.x - B.width + startw2;

    for(let lane = 1; lane < lanes + 1; startx1 += startw1, startx2 += startw2, lane++)
        {
            if(lanes > 2 && isOdd(lanes) && lane % 2 === 0) continue;
            polygon(
                ctx,
                { x: (startx1 - A.width * 0.1) - l1 / 2, y: A.y},
                { x: (startx1 - A.width * 0.1) + l1 / 2, y: A.y},
                { x: (startx2 - B.width * 0.1) + l2 / 2, y: B.y},
                { x: (startx2 - B.width * 0.1) - l2 / 2, y: B.y},
                0xfcd12a
            );

            polygon(
                ctx,
                { x: (startx1 - A.width * 0.55) - l1 / 2, y: A.y},
                { x: (startx1 - A.width * 0.55) + l1 / 2, y: A.y},
                { x: (startx2 - B.width * 0.55) + l2 / 2, y: B.y},
                { x: (startx2 - B.width * 0.55) - l2 / 2, y: B.y},
                0xfcd12a
            );
            
            const topLeftPoint = { x: (startx2 - B.width * 0.55) - l2 / 2, y: B.y };
            const topRightPoint = { x: (startx2 - B.width * 0.1) + l2 / 2, y: B.y };
            let bottomLeftPoint = { x: (startx1 - A.width * 0.55) - l1 / 2, y: A.y };
            let bottomRightPoint = { x: (startx1 - A.width * 0.1) + l1 / 2, y: A.y };
            
            const bottomLeftPointToTopLeftPoint = { x: topLeftPoint.x - bottomLeftPoint.x, y: topLeftPoint.y - bottomLeftPoint.y };
            const bottomRightPointToTopRightPoint = { x: topRightPoint.x - bottomRightPoint.x, y: topRightPoint.y - bottomRightPoint.y };

            let bottomLeftPointToTopLeftPointLength = Math.sqrt(Math.pow(bottomLeftPointToTopLeftPoint.x, 2) + Math.pow(bottomLeftPointToTopLeftPoint.y, 2));
            let bottomRightPointToTopRightPointLength = Math.sqrt(Math.pow(bottomRightPointToTopRightPoint.x, 2) + Math.pow(bottomRightPointToTopRightPoint.y, 2));

            const bottomLeftPointToTopLeftPointNormalized = { x: bottomLeftPointToTopLeftPoint.x / bottomLeftPointToTopLeftPointLength, y: bottomLeftPointToTopLeftPoint.y / bottomLeftPointToTopLeftPointLength };
            const bottomRightPointToTopRightPointNormalized = { x: bottomRightPointToTopRightPoint.x / bottomRightPointToTopRightPointLength, y: bottomRightPointToTopRightPoint.y / bottomRightPointToTopRightPointLength };

            bottomLeftPointToTopLeftPointLength = bottomLeftPointToTopLeftPointLength * 0.9;
            bottomRightPointToTopRightPointLength = bottomRightPointToTopRightPointLength * 0.9;

            const bottomLeftPointToTopLeftPointScaled = { x: bottomLeftPointToTopLeftPointNormalized.x * bottomLeftPointToTopLeftPointLength, y: bottomLeftPointToTopLeftPointNormalized.y * bottomLeftPointToTopLeftPointLength };
            const bottomRightPointToTopRightPointScaled = { x: bottomRightPointToTopRightPointNormalized.x * bottomRightPointToTopRightPointLength, y: bottomRightPointToTopRightPointNormalized.y * bottomRightPointToTopRightPointLength };

            bottomLeftPoint = { x: bottomLeftPoint.x + bottomLeftPointToTopLeftPointScaled.x, y: bottomLeftPoint.y + bottomLeftPointToTopLeftPointScaled.y };
            bottomRightPoint = { x: bottomRightPoint.x + bottomRightPointToTopRightPointScaled.x, y: bottomRightPoint.y + bottomRightPointToTopRightPointScaled.y };

            polygon(
                ctx,
                bottomLeftPoint,
                bottomRightPoint,
                topRightPoint,
                topLeftPoint,
                0xfcd12a
            );
        }

    if((color as ISegmentColor).rumble)
    {
        const colorRumble = (color as ISegmentColor).rumble;
        
        polygon(
            ctx,
            { x: A.x - A.width - r1, y: A.y},
            { x: A.x - A.width, y: A.y},
            { x: B.x - B.width, y: B.y},
            { x: B.x - B.width - r2, y: B.y},
            colorRumble
        );
        polygon(
            ctx,
            { x: A.x + A.width + r1, y: A.y},
            { x: A.x + A.width, y: A.y},
            { x: B.x + B.width, y: B.y},
            { x: B.x + B.width + r2, y: B.y},
            colorRumble
        );
    }
}

export function renderSegment(
    ctx: Graphics,
    segA: ISegmentPoint,
    segB: ISegmentPoint,
    fog: number,
    color: SegmentColor,
    lanes: number
) {
    const r1 = rumbleWidth(segA.screen.width, lanes);
    const r2 = rumbleWidth(segB.screen.width, lanes);
    const l1 = laneMarkerWidth(segA.screen.width, lanes);
    const l2 = laneMarkerWidth(segB.screen.width, lanes);

    const A = segA.screen;
    const B = segB.screen;

    ctx.beginFill((color as ISegmentColor).grass);
    ctx.drawRect(0, B.y, designConfig.content.width, A.y - B.y);

    if((color as ISegmentColor).rumble)
    {
        const colorRumble = (color as ISegmentColor).rumble;
        
        polygon(
            ctx,
            { x: A.x - A.width - r1, y: A.y},
            { x: A.x - A.width, y: A.y},
            { x: B.x - B.width, y: B.y},
            { x: B.x - B.width - r2, y: B.y},
            colorRumble
        );
        polygon(
            ctx,
            { x: A.x + A.width + r1, y: A.y},
            { x: A.x + A.width, y: A.y},
            { x: B.x + B.width, y: B.y},
            { x: B.x + B.width + r2, y: B.y},
            colorRumble
        );
    }

    if((color as ISegmentColor).road) {
        const colorRoad = (color as ISegmentColor).road;

        polygon(
            ctx,
            { x: A.x - A.width, y: A.y},
            { x: A.x + A.width, y: A.y},
            { x: B.x + B.width, y: B.y},
            { x: B.x - B.width, y: B.y},
            colorRoad
        );
    }

    if((color as ISegmentColorExt).lane) {
        const colorLane = (color as ISegmentColorExt).lane;

        const lanew1 = (A.width * 2) / lanes;
        const lanew2 = (B.width * 2) / lanes;

        let lanex1 = A.x - A.width + lanew1;
        let lanex2 = B.x - B.width + lanew2;

        for(let lane = 1; lane < lanes; lanex1 += lanew1, lanex2 += lanew2, lane++)
        {
            polygon(
                ctx,
                { x: lanex1 - l1 / 2, y: A.y},
                { x: lanex1 + l1 / 2, y: A.y},
                { x: lanex2 + l2 / 2, y: B.y},
                { x: lanex2 - l2 / 2, y: B.y},
                colorLane
            );
        }
    }

    renderFog(ctx, fog, { x: 0, y: A.y }, { x: designConfig.content.width, y: A.y - B.y });
}

function renderFog(ctx: Graphics, fog: number, location: IPointData, size: IPointData)
{
    if(fog < 1)
    {
        ctx.beginFill(COLORS.FOG, 1 - fog);
        ctx.drawRect(location.x, location.y, size.x, size.y);
        ctx.endFill();
    }
}

function rumbleWidth(projectedRoadWidth: number, lanes: number)
{
    return projectedRoadWidth / Math.max(6, 2 * lanes);
}

function laneMarkerWidth(projectedRoadWidth: number, lanes: number)
{
    return projectedRoadWidth / Math.max(32, 8 * lanes);
}