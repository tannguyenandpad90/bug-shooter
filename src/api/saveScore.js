/**
 * Mock API call to save player score.
 * Replace this with a real API call when integrating with Backend.
 *
 * @param {string} name - Player name
 * @param {number} score - Player score
 * @returns {Promise<{success: boolean, data: {name: string, score: number, id: string, timestamp: string}}>}
 */
export async function saveScore(name, score) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const entry = {
        id: crypto.randomUUID(),
        name,
        score,
        timestamp: new Date().toISOString(),
      };

      const leaderboard = JSON.parse(
        localStorage.getItem("bug_shooter_leaderboard") || "[]"
      );
      leaderboard.push(entry);
      leaderboard.sort((a, b) => b.score - a.score);
      localStorage.setItem(
        "bug_shooter_leaderboard",
        JSON.stringify(leaderboard.slice(0, 10))
      );

      resolve({ success: true, data: entry });
    }, 500);
  });
}

export function getLeaderboard() {
  return JSON.parse(
    localStorage.getItem("bug_shooter_leaderboard") || "[]"
  );
}
