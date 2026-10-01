// Dollars as Claude Code reports them, to the cent; a sliver still reads as spent.
export const costText = (usd: number): string => (usd < 0.01 ? "<$0.01" : "$" + usd.toFixed(2));
