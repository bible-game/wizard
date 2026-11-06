/** Stand-in for the webapp's server action: a visitor has no rank */
export default async function getMyRank(): Promise<{ rank?: number, totalPlayers?: number }> { return {}; }
