/**
 * Stand-in for the webapp's guess action (a server action against the user service): nothing is saved; a visitor's
 * device keeps the only copy. Play scores guesses in the browser itself (score.ts)
 */
export async function saveGuess(passageId: number, guess: any): Promise<void> { /* a visitor's device keeps the only copy */ }
