import { SystemState } from "../../SystemRunner";
import { ObjectSystem } from "./ObjectsSystem";
import RaceFinishedState from "./RaceFinishedState";

class RaceStartedState implements SystemState<ObjectSystem>
{
    public update(_ctx: ObjectSystem, _dt: number)
    {
    }
    doAction(context: ObjectSystem) {
        context.setState && context.setState(new RaceFinishedState());
    };
}

export default RaceStartedState;