import { getMatch } from "@/data/mockData";
import type { PlayerMatchStats, PlayerRating, PlayerRatingProvider, Position, RatingBreakdown } from "@/lib/types";
import { breakdownToImpacts, clamp, round, stat } from "./shared";

type StatsBombName = { id?: number; name?: string };

export type StatsBombEvent = {
  id?: string;
  type?: StatsBombName;
  player?: StatsBombName;
  team?: StatsBombName;
  pass?: {
    recipient?: StatsBombName;
    outcome?: StatsBombName | null;
    shot_assist?: boolean;
    goal_assist?: boolean;
  };
  shot?: { statsbomb_xg?: number; outcome?: StatsBombName };
  possession?: number;
  related_events?: string[];
  location?: [number, number];
  visible_area?: number[];
};

export type StatsBombData = {
  events: StatsBombEvent[];
  players?: PlayerMatchStats[];
  threeSixty?: unknown[];
};

export type StatsBombDataLoader = (matchId: string) => Promise<StatsBombData>;

const defaultLoader: StatsBombDataLoader = async (matchId) => ({
  events: [],
  players: getMatch(matchId)?.playerStats ?? [],
});

type PlayerAccumulator = {
  playerId: string;
  playerName: string;
  teamId: string;
  position: Position;
  stats: PlayerMatchStats;
  xgChainPossessions: Set<number>;
};

export type PassNetwork = {
  edgeWeights: Map<string, number>;
  playerIds: Set<string>;
};

/**
 * StatsBomb event data contains passers and recipients, so it can model possession
 * as a directed weighted graph and add PageRank-style network influence.
 * A future paid StatsBomb API adapter only needs to implement StatsBombDataLoader.
 */
export class StatsBombAdvancedRatingProvider implements PlayerRatingProvider {
  constructor(private readonly loadData: StatsBombDataLoader = defaultLoader) {}

  async getMatchRatings(matchId: string): Promise<PlayerRating[]> {
    const data = await this.loadData(matchId);
    return this.rateData(data).sort((a, b) => b.rating - a.rating);
  }

  rateData(data: StatsBombData): PlayerRating[] {
    const players = this.buildPlayers(data);
    const network = this.buildPassNetwork(data.events);
    const pageRank = this.calculatePageRank(network);
    const xgByPossession = this.getXgByPossession(data.events);

    for (const event of data.events) {
      const player = this.getEventPlayer(event);
      if (!player) continue;
      const accumulator = players.get(player.id) ?? this.createAccumulator(player.id, player.name, "unknown", "MID");
      players.set(player.id, accumulator);
      this.applyEvent(accumulator, event);
      if (typeof event.possession === "number" && xgByPossession.get(event.possession)) {
        accumulator.xgChainPossessions.add(event.possession);
      }
    }

    return [...players.values()].map((player) => this.ratePlayer(player, pageRank, xgByPossession));
  }

  buildPassNetwork(events: StatsBombEvent[]): PassNetwork {
    const completedCounts = new Map<string, number>();
    const outgoingCounts = new Map<string, number>();
    const playerIds = new Set<string>();

    for (const event of events) {
      if (event.type?.name !== "Pass" || event.pass?.outcome || !event.pass?.recipient) continue;
      const passer = this.getEventPlayer(event);
      const recipient = this.getNamedId(event.pass.recipient);
      if (!passer || !recipient) continue;
      playerIds.add(passer.id);
      playerIds.add(recipient);
      const edgeKey = `${passer.id}->${recipient}`;
      completedCounts.set(edgeKey, (completedCounts.get(edgeKey) ?? 0) + 1);
      outgoingCounts.set(passer.id, (outgoingCounts.get(passer.id) ?? 0) + 1);
    }

    const edgeWeights = new Map<string, number>();
    for (const [edgeKey, count] of completedCounts) {
      const [passerId] = edgeKey.split("->");
      edgeWeights.set(edgeKey, count / (outgoingCounts.get(passerId) || count));
    }

    return { edgeWeights, playerIds };
  }

  calculatePageRank(network: PassNetwork, iterations = 20, damping = 0.85): Map<string, number> {
    const playerIds = [...network.playerIds];
    const count = playerIds.length;
    const ranks = new Map(playerIds.map((playerId) => [playerId, count ? 1 / count : 0]));
    if (!count) return ranks;

    for (let index = 0; index < iterations; index += 1) {
      const next = new Map(playerIds.map((playerId) => [playerId, (1 - damping) / count]));
      for (const [edgeKey, weight] of network.edgeWeights) {
        const [from, to] = edgeKey.split("->");
        next.set(to, (next.get(to) ?? 0) + (ranks.get(from) ?? 0) * weight * damping);
      }
      for (const playerId of playerIds) ranks.set(playerId, next.get(playerId) ?? 0);
    }

    return ranks;
  }

  private ratePlayer(player: PlayerAccumulator, pageRank: Map<string, number>, xgByPossession: Map<number, number>): PlayerRating {
    const xgChain = [...player.xgChainPossessions].reduce((sum, possession) => sum + (xgByPossession.get(possession) ?? 0), 0);
    const maxRank = Math.max(...pageRank.values(), 0);
    const normalizedRank = maxRank > 0 ? (pageRank.get(player.playerId) ?? 0) / maxRank : 0;
    const breakdown: RatingBreakdown = {
      attacking: stat(player.stats, "goals") * 0.9 + stat(player.stats, "expectedGoals") * 0.35,
      playmaking: stat(player.stats, "assists") * 0.75 + stat(player.stats, "keyPasses") * 0.18 + stat(player.stats, "expectedAssists") * 0.35,
      possession: stat(player.stats, "progressivePasses") * 0.05,
      defensive: stat(player.stats, "tackles") * 0.12 + stat(player.stats, "interceptions") * 0.14 + stat(player.stats, "pressures") * 0.035 + stat(player.stats, "ballRecoveries") * 0.08,
      goalkeeping: player.position === "GK" ? stat(player.stats, "saves") * 0.22 : 0,
      disciplinePenalty: -(stat(player.stats, "yellowCards") * 0.25 + stat(player.stats, "redCards") * 1.25),
      networkInfluence: normalizedRank * 0.75,
      xgChain: xgChain * 0.18,
      details: ["StatsBomb event scoring with pass-recipient network influence and future 360 spatial hooks."],
    };
    const rating = round(clamp(6 + Object.entries(breakdown).reduce((sum, [, value]) => sum + (typeof value === "number" ? value : 0), 0), 0, 10));
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      teamId: player.teamId,
      position: player.position,
      rating,
      baseRating: 6,
      impacts: breakdownToImpacts(breakdown),
      breakdown,
    };
  }

  private buildPlayers(data: StatsBombData) {
    const players = new Map<string, PlayerAccumulator>();
    for (const player of data.players ?? []) {
      players.set(player.playerId, {
        playerId: player.playerId,
        playerName: player.playerName,
        teamId: player.teamId,
        position: player.position,
        stats: { ...player },
        xgChainPossessions: new Set(),
      });
    }
    return players;
  }

  private createAccumulator(playerId: string, playerName: string, teamId: string, position: Position): PlayerAccumulator {
    return {
      playerId,
      playerName,
      teamId,
      position,
      stats: { playerId, playerName, teamId, position, matchId: "statsbomb-event" },
      xgChainPossessions: new Set(),
    };
  }

  private applyEvent(player: PlayerAccumulator, event: StatsBombEvent) {
    const type = event.type?.name;
    if (type === "Pass") {
      if (!event.pass?.outcome) player.stats.progressivePasses = stat(player.stats, "progressivePasses") + 1;
      if (event.pass?.shot_assist) player.stats.keyPasses = stat(player.stats, "keyPasses") + 1;
      if (event.pass?.goal_assist) player.stats.assists = stat(player.stats, "assists") + 1;
    } else if (type === "Shot") {
      player.stats.expectedGoals = stat(player.stats, "expectedGoals") + (event.shot?.statsbomb_xg ?? 0);
      if (event.shot?.outcome?.name === "Goal") player.stats.goals = stat(player.stats, "goals") + 1;
    } else if (type === "Duel" || type === "Interception" || type === "Block" || type === "Clearance") {
      player.stats.tackles = stat(player.stats, "tackles") + 1;
    } else if (type === "Pressure") {
      player.stats.pressures = stat(player.stats, "pressures") + 1;
    } else if (type === "Ball Recovery") {
      player.stats.ballRecoveries = stat(player.stats, "ballRecoveries") + 1;
    }
  }

  private getXgByPossession(events: StatsBombEvent[]) {
    const xgByPossession = new Map<number, number>();
    for (const event of events) {
      if (event.type?.name !== "Shot" || typeof event.possession !== "number") continue;
      xgByPossession.set(event.possession, (xgByPossession.get(event.possession) ?? 0) + (event.shot?.statsbomb_xg ?? 0));
    }
    return xgByPossession;
  }

  private getEventPlayer(event: StatsBombEvent) {
    const id = this.getNamedId(event.player);
    const name = event.player?.name;
    return id && name ? { id, name } : undefined;
  }

  private getNamedId(value?: StatsBombName) {
    if (!value) return undefined;
    if (typeof value.id === "number") return String(value.id);
    return undefined;
  }
}
