import type { Match, PlayerStats, Team } from "@/lib/types";

export const teams: Team[] = [
  { id: "arg", name: "Argentina", shortName: "ARG", flag: "🇦🇷", fifaRank: 1, group: "A" },
  { id: "fra", name: "France", shortName: "FRA", flag: "🇫🇷", fifaRank: 2, group: "A" },
  { id: "bra", name: "Brazil", shortName: "BRA", flag: "🇧🇷", fifaRank: 5, group: "B" },
  { id: "eng", name: "England", shortName: "ENG", flag: "🏴", fifaRank: 4, group: "B" },
  { id: "esp", name: "Spain", shortName: "ESP", flag: "🇪🇸", fifaRank: 3, group: "C" },
  { id: "usa", name: "United States", shortName: "USA", flag: "🇺🇸", fifaRank: 11, group: "C" },
];

const argentinaPlayers: PlayerStats[] = [
  { playerId: "arg-10", matchId: "arg-fra-live", teamId: "arg", playerName: "Lionel Messi", position: "FWD", minutesPlayed: 68, goals: 1, assists: 1, expectedGoals: 0.62, expectedAssists: 0.38, shotsOnTarget: 2, keyPasses: 4, passCompletion: 88, progressivePasses: 7, tackles: 1, interceptions: 0, clearances: 0, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
  { playerId: "arg-9", matchId: "arg-fra-live", teamId: "arg", playerName: "Julián Álvarez", position: "FWD", minutesPlayed: 68, goals: 1, assists: 0, expectedGoals: 0.71, expectedAssists: 0.08, shotsOnTarget: 3, keyPasses: 1, passCompletion: 81, progressivePasses: 2, tackles: 2, interceptions: 1, clearances: 0, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
  { playerId: "arg-20", matchId: "arg-fra-live", teamId: "arg", playerName: "Alexis Mac Allister", position: "MID", minutesPlayed: 68, goals: 0, assists: 1, expectedGoals: 0.14, expectedAssists: 0.31, shotsOnTarget: 1, keyPasses: 3, passCompletion: 91, progressivePasses: 8, tackles: 3, interceptions: 2, clearances: 1, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 1, redCards: 0 },
  { playerId: "arg-13", matchId: "arg-fra-live", teamId: "arg", playerName: "Cristian Romero", position: "DEF", minutesPlayed: 68, goals: 0, assists: 0, expectedGoals: 0.04, expectedAssists: 0.02, shotsOnTarget: 0, keyPasses: 0, passCompletion: 86, progressivePasses: 4, tackles: 4, interceptions: 3, clearances: 6, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 1, redCards: 0 },
];

const francePlayers: PlayerStats[] = [
  { playerId: "fra-10", matchId: "arg-fra-live", teamId: "fra", playerName: "Kylian Mbappé", position: "FWD", minutesPlayed: 68, goals: 1, assists: 0, expectedGoals: 0.68, expectedAssists: 0.11, shotsOnTarget: 3, keyPasses: 2, passCompletion: 84, progressivePasses: 5, tackles: 1, interceptions: 0, clearances: 0, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
  { playerId: "fra-7", matchId: "arg-fra-live", teamId: "fra", playerName: "Antoine Griezmann", position: "MID", minutesPlayed: 68, goals: 0, assists: 1, expectedGoals: 0.2, expectedAssists: 0.44, shotsOnTarget: 1, keyPasses: 5, passCompletion: 85, progressivePasses: 9, tackles: 2, interceptions: 2, clearances: 2, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
  { playerId: "fra-4", matchId: "arg-fra-live", teamId: "fra", playerName: "Raphaël Varane", position: "DEF", minutesPlayed: 68, goals: 0, assists: 0, expectedGoals: 0.03, expectedAssists: 0.01, shotsOnTarget: 0, keyPasses: 0, passCompletion: 89, progressivePasses: 3, tackles: 2, interceptions: 4, clearances: 7, errorsLeadingToShots: 1, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
  { playerId: "fra-1", matchId: "arg-fra-live", teamId: "fra", playerName: "Mike Maignan", position: "GK", minutesPlayed: 68, goals: 0, assists: 0, expectedGoals: 0, expectedAssists: 0, shotsOnTarget: 0, keyPasses: 0, passCompletion: 79, progressivePasses: 1, tackles: 0, interceptions: 0, clearances: 3, errorsLeadingToShots: 0, errorsLeadingToGoals: 1, yellowCards: 0, redCards: 0 },
];

export const matches: Match[] = [
  {
    id: "arg-fra-live",
    stage: "Final · Live",
    venue: "MetLife Stadium",
    city: "East Rutherford",
    kickoff: "2026-07-19T19:00:00Z",
    status: "live",
    minute: 68,
    homeTeamId: "arg",
    awayTeamId: "fra",
    homeScore: 2,
    awayScore: 1,
    timeline: [
      { minute: 12, type: "goal", teamId: "arg", player: "Julián Álvarez", detail: "Right-footed finish from a Messi through ball" },
      { minute: 31, type: "card", teamId: "arg", player: "Alexis Mac Allister", detail: "Yellow card for tactical foul" },
      { minute: 44, stoppage: 1, type: "goal", teamId: "fra", player: "Kylian Mbappé", detail: "Penalty converted low to the left" },
      { minute: 57, type: "goal", teamId: "arg", player: "Lionel Messi", detail: "Curled finish after a cutback from Mac Allister" },
      { minute: 63, type: "shot", teamId: "fra", player: "Antoine Griezmann", detail: "Saved effort from the edge of the area" },
    ],
    teamStats: {
      arg: { possession: 53, shots: 12, shotsOnTarget: 6, expectedGoals: 1.82, corners: 5, fouls: 9, passes: 502, passCompletion: 88 },
      fra: { possession: 47, shots: 9, shotsOnTarget: 4, expectedGoals: 1.26, corners: 3, fouls: 11, passes: 441, passCompletion: 84 },
    },
    lineups: {
      arg: {
        formation: "4-3-3",
        starters: [
          { playerId: "arg-10", name: "Lionel Messi", shirtNumber: 10, position: "FWD" },
          { playerId: "arg-9", name: "Julián Álvarez", shirtNumber: 9, position: "FWD" },
          { playerId: "arg-20", name: "Alexis Mac Allister", shirtNumber: 20, position: "MID" },
          { playerId: "arg-13", name: "Cristian Romero", shirtNumber: 13, position: "DEF" },
        ],
        substitutes: [{ playerId: "arg-22", name: "Lautaro Martínez", shirtNumber: 22, position: "FWD" }],
      },
      fra: {
        formation: "4-2-3-1",
        starters: [
          { playerId: "fra-10", name: "Kylian Mbappé", shirtNumber: 10, position: "FWD" },
          { playerId: "fra-7", name: "Antoine Griezmann", shirtNumber: 7, position: "MID" },
          { playerId: "fra-4", name: "Raphaël Varane", shirtNumber: 4, position: "DEF" },
          { playerId: "fra-1", name: "Mike Maignan", shirtNumber: 1, position: "GK" },
        ],
        substitutes: [{ playerId: "fra-11", name: "Ousmane Dembélé", shirtNumber: 11, position: "FWD" }],
      },
    },
    playerStats: [...argentinaPlayers, ...francePlayers],
  },
  {
    id: "bra-eng-upcoming",
    stage: "Semi-final",
    venue: "AT&T Stadium",
    city: "Arlington",
    kickoff: "2026-07-15T00:00:00Z",
    status: "upcoming",
    homeTeamId: "bra",
    awayTeamId: "eng",
    homeScore: null,
    awayScore: null,
    timeline: [],
    teamStats: {},
    lineups: {},
    playerStats: [],
  },
  {
    id: "esp-usa-recent",
    stage: "Quarter-final",
    venue: "Lumen Field",
    city: "Seattle",
    kickoff: "2026-07-10T22:00:00Z",
    status: "recent",
    homeTeamId: "esp",
    awayTeamId: "usa",
    homeScore: 3,
    awayScore: 1,
    timeline: [
      { minute: 18, type: "goal", teamId: "esp", player: "Pedri", detail: "First-time finish from central space" },
      { minute: 39, type: "goal", teamId: "usa", player: "Christian Pulisic", detail: "Counter-attacking equalizer" },
      { minute: 72, type: "goal", teamId: "esp", player: "Álvaro Morata", detail: "Header from six yards" },
      { minute: 88, type: "goal", teamId: "esp", player: "Nico Williams", detail: "Breakaway goal" },
    ],
    teamStats: {
      esp: { possession: 61, shots: 17, shotsOnTarget: 8, expectedGoals: 2.64, corners: 7, fouls: 8, passes: 682, passCompletion: 91 },
      usa: { possession: 39, shots: 8, shotsOnTarget: 3, expectedGoals: 0.93, corners: 2, fouls: 13, passes: 368, passCompletion: 82 },
    },
    lineups: {},
    playerStats: [
      { playerId: "esp-8", matchId: "esp-usa-recent", teamId: "esp", playerName: "Pedri", position: "MID", minutesPlayed: 90, goals: 1, assists: 1, expectedGoals: 0.48, expectedAssists: 0.51, shotsOnTarget: 2, keyPasses: 6, passCompletion: 94, progressivePasses: 11, tackles: 2, interceptions: 2, clearances: 0, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
      { playerId: "usa-10", matchId: "esp-usa-recent", teamId: "usa", playerName: "Christian Pulisic", position: "FWD", minutesPlayed: 90, goals: 1, assists: 0, expectedGoals: 0.42, expectedAssists: 0.16, shotsOnTarget: 2, keyPasses: 2, passCompletion: 83, progressivePasses: 5, tackles: 1, interceptions: 1, clearances: 0, errorsLeadingToShots: 0, errorsLeadingToGoals: 0, yellowCards: 0, redCards: 0 },
    ],
  },
];

export function getTeam(teamId: string): Team {
  const team = teams.find((item) => item.id === teamId);

  if (!team) {
    throw new Error(`Team not found: ${teamId}`);
  }

  return team;
}

export function getMatch(matchId: string): Match | undefined {
  return matches.find((match) => match.id === matchId);
}
