/**
 * Leveling XP Calculation Utilities.
 * Uses standard quadratic leveling progression curve.
 */

export class XpCalculator {
  /**
   * Calculate the XP required to advance from `level` to `level + 1`.
   */
  public static xpForNextLevel(level: number): number {
    return 5 * Math.pow(level, 2) + 50 * level + 100;
  }

  /**
   * Calculate cumulative total XP required to reach a specific level from 0.
   */
  public static totalXpForLevel(targetLevel: number): number {
    let total = 0;
    for (let l = 0; l < targetLevel; l++) {
      total += this.xpForNextLevel(l);
    }
    return total;
  }

  /**
   * Determine user level and progress within the current level from total XP.
   */
  public static getLevelProgress(totalXp: number | bigint): {
    level: number;
    currentLevelXp: number;
    neededLevelXp: number;
    percent: number;
  } {
    const xp = Number(totalXp);
    let level = 0;
    let accumulated = 0;

    while (true) {
      const needed = this.xpForNextLevel(level);
      if (accumulated + needed > xp) {
        const currentLevelXp = xp - accumulated;
        const percent = Math.min(100, Math.max(0, Math.floor((currentLevelXp / needed) * 100)));
        return {
          level,
          currentLevelXp,
          neededLevelXp: needed,
          percent,
        };
      }
      accumulated += needed;
      level++;
    }
  }

  /**
   * Generate an ASCII / emoji progress bar.
   */
  public static generateProgressBar(percent: number, length = 12): string {
    const filledLength = Math.round((length * percent) / 100);
    const emptyLength = length - filledLength;
    const filled = "█".repeat(Math.max(0, filledLength));
    const empty = "░".repeat(Math.max(0, emptyLength));
    return `\`[${filled}${empty}]\` ${percent}%`;
  }
}
