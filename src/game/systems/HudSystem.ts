import { System } from "../SystemRunner";
import { Game } from "../";
import { Container, Text, TextStyle, Graphics } from "pixi.js";
import { designConfig } from "../designConfig";
import { IconButton } from "../../ui/buttons/IconButton";
import { PauseSystem } from "./PauseSystem";
import { TouchJoystick, JoystickChangeEvent } from '../TouchJoystick';
import { ControlButton, ControlButtonChangeEvent } from "../ControlButton";
import { Signal } from "typed-signals";

export class HudSystem implements System {
    public static SYSTEM_ID = 'hud';
    public game!: Game;
    public view = new Container();

    public signals = {
        onTouchJoystickStart: new Signal<() => void>(),
        onTouchJoystickMove: new Signal<(data: JoystickChangeEvent) => void>(),
        onTouchJoystickEnd: new Signal<() => void>(),
        onAccelChange: new Signal<(data: ControlButtonChangeEvent) => void>(),
        onBrakeChange: new Signal<(data: ControlButtonChangeEvent) => void>(),
        onGearChange: new Signal<(data: ControlButtonChangeEvent) => void>()
    };

    private readonly _gameHudContainer = new Container();
    private _pauseButton!: IconButton;
    private _joystick!: TouchJoystick;
    private _accelButton!: ControlButton;
    private _brakeButton!: ControlButton;
    private _gearButton!: ControlButton;

    private _lapCounter!: Text;
    private _positionCounter!: Text;
    private _waitingMessage!: Text;
    private _dynamicResultsContainer!: Container;
    private _dynamicResults: Container[] = [];
    private _resultsTitle!: Text;
    private _playerHasFinished: boolean = false;

    public async awake() {
        this.initWhenTrackReady();
        this._gameHudContainer.visible = true;
    }
    
    public initWhenTrackReady() {
        this.view.addChild(this._gameHudContainer);
        this.game.stage.addChild(this.view);

        const pause = this.game.systems.get(PauseSystem);

        this._pauseButton = new IconButton('icon-pause');
        this._pauseButton.onPress.connect(() => pause.pause());
        this._pauseButton.x = designConfig.content.width - 40;
        this._pauseButton.y = 40;

        const style = new TextStyle({
            fontFamily: 'Bungee-Regular',
            fontSize: 24,
            fill: 0xffffff,
            stroke: {
                width: 4,
                color: 0x000000,
                join: 'round'
            },
            align: 'center'
        });

        this._lapCounter = new Text({ text: 'Laps: 0/3', style: style });
        this._lapCounter.x = 20;
        this._lapCounter.y = 20;

        this._positionCounter = new Text({ text: 'Pos: 12', style: style });
        this._positionCounter.x = 20;
        this._positionCounter.y = 50;

        this._gameHudContainer.width = designConfig.content.width;
        this._gameHudContainer.height = designConfig.content.height;

        this._gameHudContainer.addChild(this._pauseButton);
        this._gameHudContainer.addChild(this._lapCounter);
        this._gameHudContainer.addChild(this._positionCounter);

        if (this.game.isMobileDevice) {
            this._joystick = new TouchJoystick({
                onStart: () => {
                    this.signals.onTouchJoystickStart.emit();
                },
                onChange: (data) => {
                    this.signals.onTouchJoystickMove.emit(data);
                },
                onEnd: () => {
                    this.signals.onTouchJoystickEnd.emit();
                }
            });

            this._joystick.x = 100;
            this._joystick.y = designConfig.content.height - 100;

            this._accelButton = new ControlButton({
                btnColor: 0x00FF00,
                onChange: (data) => {
                    this.signals.onAccelChange.emit(data);
                }
            });

            this._accelButton.x = designConfig.content.width - 100;
            this._accelButton.y = designConfig.content.height - 80;

            this._brakeButton = new ControlButton({
                btnColor: 0xFF0000,
                onChange: (data) => {
                    this.signals.onBrakeChange.emit(data);
                }
            });

            this._brakeButton.x = designConfig.content.width - 180;
            this._brakeButton.y = designConfig.content.height - 80;

            this._gearButton = new ControlButton({
                btnColor: 0x0000FF,
                onChange: (data) => {
                    this.signals.onGearChange.emit(data);
                }
            });
            this._gearButton.x = designConfig.content.width - 40;
            this._gearButton.y = designConfig.content.height - 120;

            this._gameHudContainer.addChild(this._joystick, this._accelButton, this._brakeButton, this._gearButton);
        }
    }

    public setLapCount(laps: number) {
        const displayLaps = laps <= 0 ? 0 : laps;
        this._lapCounter.text = `Laps: ${displayLaps}/3`;
    }

    public setPosition(position: number) {
        this._positionCounter.text = `Pos: ${position}`;
    }

    public showWaitingForDrivers(driversRemaining: number) {
        // Remove existing waiting message
        this.hideWaitingForDrivers();

        const style = new TextStyle({
            fontFamily: 'Bungee-Regular',
            fontSize: 20,
            fill: 0xffff00,
            stroke: {
                width: 3,
                color: 0x000000,
                join: 'round'
            },
            align: 'center'
        });

        this._waitingMessage = new Text({ 
            text: `RACE FINISHED! Waiting for ${driversRemaining} driver(s)...`, 
            style: style 
        });
        this._waitingMessage.anchor.set(0.5);
        this._waitingMessage.x = designConfig.content.width / 2;
        this._waitingMessage.y = 50; // Position above the dynamic results which start at y=80
        
        this._gameHudContainer.addChild(this._waitingMessage);
    }

    public hideWaitingForDrivers() {
        if (this._waitingMessage && this._waitingMessage.parent) {
            this._waitingMessage.parent.removeChild(this._waitingMessage);
        }
    }

    public setPlayerFinished() {
        console.log(`HUD: setPlayerFinished called - setting _playerHasFinished to true`);
        this._playerHasFinished = true;
    }

    public showDynamicResults(finishOrder: Array<{racerId: string, driverName: string, position: number, finishTime: number}>, remainingCars: number = 0) {
        console.log(`HUD: showDynamicResults called with ${finishOrder.length} results, playerHasFinished: ${this._playerHasFinished}`);
        
        // Only show results AFTER player has finished
        if (!this._playerHasFinished) {
            console.log(`HUD: Not showing results - player hasn't finished yet`);
            return;
        }

        // Remove existing results
        this.hideDynamicResults();

        // Create main container
        this._dynamicResultsContainer = new Container();
        
        // Create semi-transparent background - size for all 12 possible entries
        const background = new Container();
        const bgGraphics = new Graphics();
        const maxEntries = 12;
        const entryHeight = 16; // Further reduced from 18 to 16 for better fit
        const headerHeight = 45; // Reduced header space from 55 to 45
        const totalHeight = headerHeight + (maxEntries * entryHeight);
        bgGraphics.rect(0, 0, 500, totalHeight); // Fixed height for all 12 entries
        bgGraphics.fill({ color: 0x000000, alpha: 0.8 });
        bgGraphics.stroke({ color: 0xFFD700, width: 2 });
        background.addChild(bgGraphics);
        background.x = designConfig.content.width / 2 - 250;
        background.y = 80;
        this._dynamicResultsContainer.addChild(background);

        // Title (using same style as RaceResultsScreen)
        const titleStyle = new TextStyle({
            fontSize: 24,
            fill: 0xffc42c,
            fontWeight: 'bold',
            fontFamily: 'BebasNeue-Regular',
            align: 'center'
        });

        const titleText = remainingCars > 0 ? `LIVE RESULTS - ${remainingCars} TO FINISH` : 'FINAL RESULTS';
        
        this._resultsTitle = new Text({ 
            text: titleText, 
            style: titleStyle 
        });
        this._resultsTitle.anchor.set(0.5);
        this._resultsTitle.x = designConfig.content.width / 2;
        this._resultsTitle.y = 100;
        this._dynamicResultsContainer.addChild(this._resultsTitle);

        // Create header row (same format as RaceResultsScreen with 4 columns)
        const headerRow = this.createResultRow('POS', 'DRIVER', 'TIME', 'POINTS', 115, true); // Further reduced Y position from 125 to 115
        this._dynamicResultsContainer.addChild(headerRow);

        // Create result rows with more condensed spacing
        this._dynamicResults = [];
        const maxVisible = Math.min(finishOrder.length, 12); // Limit to 12 entries to fit screen
        
        for (let i = 0; i < maxVisible; i++) {
            const result = finishOrder[i];
            const y = 135 + (i * 16); // Further reduced spacing from 18 to 16, and base from 145 to 135
            // Calculate points based on position (Formula 1 style)
            const points = this.calculatePoints(result.position);
            const row = this.createResultRow(
                result.position.toString(),
                result.driverName,
                this.formatLapTime(result.finishTime),
                points.toString(),
                y,
                false,
                result.racerId === 'player'
            );
            this._dynamicResults.push(row);
            this._dynamicResultsContainer.addChild(row);
        }

        this._gameHudContainer.addChild(this._dynamicResultsContainer);
    }

    public updateDynamicResults(finishOrder: Array<{racerId: string, driverName: string, position: number, finishTime: number}>, remainingCars: number = 0) {
        console.log(`HUD: updateDynamicResults called with ${finishOrder.length} results, playerHasFinished: ${this._playerHasFinished}, container exists: ${!!this._dynamicResultsContainer}`);
        
        // Only update if player has finished and results are already showing
        if (!this._playerHasFinished || !this._dynamicResultsContainer) {
            console.log(`HUD: Not updating results - conditions not met`);
            return;
        }

        // Update the title with remaining cars count
        if (this._resultsTitle) {
            const titleText = remainingCars > 0 ? `LIVE RESULTS - ${remainingCars} TO FINISH` : 'FINAL RESULTS';
            this._resultsTitle.text = titleText;
        }

        // Remove existing result rows but keep title and header
        this._dynamicResults.forEach(row => {
            if (row.parent) {
                row.parent.removeChild(row);
            }
        });
        this._dynamicResults = [];

        // Recreate result rows with updated data and condensed spacing
        const maxVisible = Math.min(finishOrder.length, 12);
        
        for (let i = 0; i < maxVisible; i++) {
            const result = finishOrder[i];
            const y = 135 + (i * 16); // Reduced spacing from 18 to 16, and base from 145 to 135
            // Calculate points based on position
            const points = this.calculatePoints(result.position);
            const row = this.createResultRow(
                result.position.toString(),
                result.driverName,
                this.formatLapTime(result.finishTime),
                points.toString(),
                y,
                false,
                result.racerId === 'player'
            );
            this._dynamicResults.push(row);
            this._dynamicResultsContainer.addChild(row);
        }
    }

    private createResultRow(
        position: string,
        name: string,
        time: string,
        points: string,
        y: number,
        isHeader: boolean = false,
        isPlayer: boolean = false
    ): Container {
        const row = new Container();
        row.y = y;

        const fontSize = isHeader ? 16 : 14;
        const color = isHeader ? 0xffc42c : (isPlayer ? 0x00ff00 : 0xffffff);
        const fontWeight = isHeader || isPlayer ? 'bold' : 'normal';

        const tableWidth = 480;
        const halfWidth = tableWidth / 2;
        const baseX = designConfig.content.width / 2;

        const posText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue-Regular',
                align: 'center'
            },
            text: position
        });
        posText.x = baseX - halfWidth + 30;
        row.addChild(posText);

        const nameText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue-Regular',
                align: 'left'
            },
            text: name.length > 12 ? name.substring(0, 12) + "..." : name // Truncate long names
        });
        nameText.x = baseX - halfWidth + 70;
        row.addChild(nameText);

        const timeText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue-Regular',
                align: 'center'
            },
            text: time
        });
        timeText.x = baseX + halfWidth - 120;
        row.addChild(timeText);

        const pointsText = new Text({
            style: {
                fontSize,
                fill: color,
                fontWeight,
                fontFamily: 'BebasNeue-Regular',
                align: 'center'
            },
            text: points
        });
        pointsText.x = baseX + halfWidth - 30;
        row.addChild(pointsText);

        return row;
    }

    private formatLapTime(timeInSeconds: number): string {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const milliseconds = Math.floor((timeInSeconds % 1) * 100);
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    }

    private calculatePoints(position: number): number {
        // Formula 1 style points system
        const pointsTable = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
        return position <= pointsTable.length ? pointsTable[position - 1] : 0;
    }

    public hideDynamicResults() {
        if (this._dynamicResultsContainer && this._dynamicResultsContainer.parent) {
            this._dynamicResultsContainer.parent.removeChild(this._dynamicResultsContainer);
        }
        this._dynamicResults = [];
    }

    public reset(): void {
        this.hideDynamicResults(); // Clean up dynamic results
        this._playerHasFinished = false; // Reset player finished flag
        this._gameHudContainer.removeChildren();

        if (this._gameHudContainer.parent) {
            this._gameHudContainer.parent.removeChild(this._gameHudContainer);
        }

        if (this.view.parent) {
            this.view.parent.removeChild(this.view);
        }

        this.signals.onTouchJoystickStart.disconnectAll();
        this.signals.onTouchJoystickMove.disconnectAll();
        this.signals.onTouchJoystickEnd.disconnectAll();
        this.signals.onAccelChange.disconnectAll();
        this.signals.onBrakeChange.disconnectAll();
        this.signals.onGearChange.disconnectAll();

        this.view = new Container();

        this._gameHudContainer.visible = true;

        if (this._lapCounter) this.setLapCount(-1); 
        if (this._positionCounter) this.setPosition(1);
    }
}