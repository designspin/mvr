import { SystemState } from "../../SystemRunner";
import { ObjectSystem } from "./ObjectsSystem";
import WaitingForLights from "./WaitForLightsState";

class RaceFinishedState implements SystemState<ObjectSystem>
{
    public update(_ctx: ObjectSystem, _dt: number)
    {
    }
    doAction(context: ObjectSystem) {
        context.setState && context.setState(new WaitingForLights());
    };
}

export default RaceFinishedState;