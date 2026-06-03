import { matches, teams } from "@/data/mockData";
import type { Match, Team } from "./types";

export interface FootballDataProvider {
  getMatches(): Promise<Match[]>;
  getMatch(id: string): Promise<Match | undefined>;
  getTeams(): Promise<Team[]>;
}

export class MockFootballDataProvider implements FootballDataProvider {
  async getMatches() {
    return matches;
  }

  async getMatch(id: string) {
    return matches.find((match) => match.id === id);
  }

  async getTeams() {
    return teams;
  }
}

export const footballDataProvider: FootballDataProvider = new MockFootballDataProvider();
