/** Stand-in for the webapp's server action: a visitor has no account, so no saved games */
import { GameState } from "@/core/model/state/game-state";

export async function getGameState(): Promise<Map<number, GameState> | undefined> { return undefined; }
