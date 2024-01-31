import { AppScreen } from "./AppScreen";

export interface AppScreenConstructor {
    readonly SCREEN_ID: string;
    readonly assetBundles?: string[];
    new(): AppScreen;
}