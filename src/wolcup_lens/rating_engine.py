"""Player rating engine built around a PageRank-inspired passing network.

The public entry point is :class:`PlayerRatingEngine`. Provide player metadata,
completed/incomplete pass events, and per-player box-score/event totals for one
match. The engine returns a 0-10 rating plus a module-by-module explanation.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from enum import Enum
from math import isfinite
from typing import Iterable, Mapping, Sequence


class PositionGroup(str, Enum):
    """Supported position buckets and their PassRank multipliers."""

    GK = "GK"
    CB = "CB"
    FB_WB = "FB/WB"
    DM = "DM"
    CM = "CM"
    AM_WINGER = "AM/Winger"
    ST = "ST"


POSITION_MULTIPLIERS: dict[PositionGroup, float] = {
    PositionGroup.GK: 0.55,
    PositionGroup.CB: 0.65,
    PositionGroup.FB_WB: 0.80,
    PositionGroup.DM: 0.90,
    PositionGroup.CM: 1.00,
    PositionGroup.AM_WINGER: 1.15,
    PositionGroup.ST: 1.20,
}


@dataclass(frozen=True)
class Player:
    """A player participating in the match."""

    player_id: str
    name: str
    position: PositionGroup
    minutes: float = 90.0


@dataclass(frozen=True)
class PassEvent:
    """A pass event used to build and contextualize the passing network."""

    passer_id: str
    receiver_id: str | None
    completed: bool
    start_x: float
    start_y: float
    end_x: float
    end_y: float

    @property
    def vertical_progress(self) -> float:
        """Return goalward progress on a normalized 0-100 pitch."""

        return self.end_x - self.start_x

    @property
    def direction(self) -> str:
        """Classify the pass direction from the attacking team's perspective."""

        if self.vertical_progress >= 5:
            return "forward"
        if self.vertical_progress <= -5:
            return "backward"
        return "sideways"

    @property
    def is_progressive(self) -> bool:
        """Treat passes that move at least 10 pitch units goalward as progressive."""

        return self.vertical_progress >= 10

    @property
    def ends_final_third(self) -> bool:
        """Return whether the pass ends in the attacking final third."""

        return self.end_x >= 66.7

    @property
    def is_low_value_defensive_recycle(self) -> bool:
        """Identify conservative recycling in the defensive third."""

        return self.start_x < 40 and self.end_x < 40 and self.vertical_progress <= 3


@dataclass(frozen=True)
class PlayerMatchStats:
    """Box-score and event totals for the non-PassRank scoring modules."""

    goals: int = 0
    assists: int = 0
    xg: float = 0.0
    xa: float = 0.0
    tackles: int = 0
    interceptions: int = 0
    blocks: int = 0
    clearances: int = 0
    saves: int = 0
    goals_conceded: int = 0
    errors_leading_to_shot: int = 0
    errors_leading_to_goal: int = 0
    yellow_cards: int = 0
    red_cards: int = 0


@dataclass(frozen=True)
class ModuleScore:
    """A named contribution to the final player rating."""

    name: str
    points: float
    explanation: str


@dataclass(frozen=True)
class PlayerRating:
    """Final rating output for one player."""

    player_id: str
    player_name: str
    rating: float
    passrank: float
    adjusted_passrank: float
    modules: tuple[ModuleScore, ...]
    explanation: str


@dataclass(frozen=True)
class RatingResult:
    """Ratings plus intermediate network artifacts for a match."""

    ratings: dict[str, PlayerRating]
    edge_weights: dict[tuple[str, str], float]
    raw_passrank: dict[str, float]
    adjusted_passrank: dict[str, float]


@dataclass(frozen=True)
class RatingWeights:
    """Tunable weights and caps for translating events into 0-10 ratings."""

    damping: float = 0.85
    iterations: int = 100
    tolerance: float = 1e-9
    passrank_weight: float = 1.55
    passrank_cap: float = 2.6
    negative_passrank_cap: float = -2.0
    goal_points: float = 1.10
    assist_points: float = 0.80
    xg_points: float = 0.35
    xa_points: float = 0.30
    defensive_action_points: float = 0.075
    save_points: float = 0.28
    goal_conceded_penalty: float = 0.18
    error_shot_penalty: float = 0.85
    error_goal_penalty: float = 1.65
    yellow_card_penalty: float = 0.35
    red_card_penalty: float = 1.80


class PlayerRatingEngine:
    """Compute PassRank-adjusted 0-10 player ratings for a single match."""

    def __init__(self, weights: RatingWeights | None = None) -> None:
        self.weights = weights or RatingWeights()

    def rate_match(
        self,
        players: Sequence[Player],
        passes: Iterable[PassEvent],
        stats: Mapping[str, PlayerMatchStats] | None = None,
    ) -> RatingResult:
        """Rate every player in a match.

        Edge weights are the percentage of a passer's completed passes that went
        to each receiver. Raw PassRank is then multiplied by position and pass
        context factors before being combined with scoring modules.
        """

        if not players:
            raise ValueError("rate_match requires at least one player")

        player_by_id = {player.player_id: player for player in players}
        if len(player_by_id) != len(players):
            raise ValueError("player_id values must be unique")

        pass_list = list(passes)
        completed_passes = [event for event in pass_list if event.completed and event.receiver_id]
        edge_weights = self._build_edge_weights(completed_passes, player_by_id)
        raw_passrank = self._calculate_passrank(player_by_id.keys(), edge_weights)
        adjusted_passrank = self._adjust_passrank(players, completed_passes, raw_passrank)
        ratings = self._score_players(players, stats or {}, raw_passrank, adjusted_passrank)

        return RatingResult(
            ratings=ratings,
            edge_weights=edge_weights,
            raw_passrank=raw_passrank,
            adjusted_passrank=adjusted_passrank,
        )

    def _build_edge_weights(
        self,
        completed_passes: Sequence[PassEvent],
        player_by_id: Mapping[str, Player],
    ) -> dict[tuple[str, str], float]:
        pass_counts: Counter[tuple[str, str]] = Counter()
        outgoing_counts: Counter[str] = Counter()

        for event in completed_passes:
            if event.passer_id not in player_by_id or event.receiver_id not in player_by_id:
                continue
            pass_counts[(event.passer_id, event.receiver_id)] += 1
            outgoing_counts[event.passer_id] += 1

        return {
            edge: count / outgoing_counts[edge[0]]
            for edge, count in pass_counts.items()
            if outgoing_counts[edge[0]]
        }

    def _calculate_passrank(
        self,
        player_ids: Iterable[str],
        edge_weights: Mapping[tuple[str, str], float],
    ) -> dict[str, float]:
        ids = tuple(player_ids)
        node_count = len(ids)
        if node_count == 0:
            return {}

        outgoing = defaultdict(dict)
        for (passer_id, receiver_id), weight in edge_weights.items():
            outgoing[passer_id][receiver_id] = weight

        ranks = {player_id: 1.0 / node_count for player_id in ids}
        teleport = (1.0 - self.weights.damping) / node_count

        for _ in range(self.weights.iterations):
            next_ranks = {player_id: teleport for player_id in ids}
            dangling_share = sum(
                ranks[player_id] for player_id in ids if not outgoing.get(player_id)
            ) / node_count

            for passer_id in ids:
                if not outgoing.get(passer_id):
                    continue
                for receiver_id, edge_weight in outgoing[passer_id].items():
                    next_ranks[receiver_id] += self.weights.damping * ranks[passer_id] * edge_weight

            for player_id in ids:
                next_ranks[player_id] += self.weights.damping * dangling_share

            delta = sum(abs(next_ranks[player_id] - ranks[player_id]) for player_id in ids)
            ranks = next_ranks
            if delta < self.weights.tolerance:
                break

        return ranks

    def _adjust_passrank(
        self,
        players: Sequence[Player],
        completed_passes: Sequence[PassEvent],
        raw_passrank: Mapping[str, float],
    ) -> dict[str, float]:
        received = defaultdict(list)
        for event in completed_passes:
            if event.receiver_id:
                received[event.receiver_id].append(event)

        adjusted = {}
        for player in players:
            context_multiplier = self._pass_context_multiplier(received[player.player_id])
            position_multiplier = POSITION_MULTIPLIERS[player.position]
            adjusted[player.player_id] = (
                raw_passrank.get(player.player_id, 0.0) * position_multiplier * context_multiplier
            )
        return adjusted

    def _pass_context_multiplier(self, received_passes: Sequence[PassEvent]) -> float:
        if not received_passes:
            return 0.85

        multipliers = []
        for event in received_passes:
            location = 1.0 + min(max(event.end_x - 50.0, -30.0), 45.0) / 220.0
            direction = {"forward": 1.08, "sideways": 1.0, "backward": 0.90}[event.direction]
            progressive = 1.14 if event.is_progressive else 1.0
            final_third = 1.12 if event.ends_final_third else 1.0
            recycle = 0.82 if event.is_low_value_defensive_recycle else 1.0
            multipliers.append(location * direction * progressive * final_third * recycle)

        return _clamp(sum(multipliers) / len(multipliers), 0.65, 1.55)

    def _score_players(
        self,
        players: Sequence[Player],
        stats: Mapping[str, PlayerMatchStats],
        raw_passrank: Mapping[str, float],
        adjusted_passrank: Mapping[str, float],
    ) -> dict[str, PlayerRating]:
        average_adjusted = sum(adjusted_passrank.values()) / len(players)
        average_adjusted = average_adjusted or 1.0
        ratings = {}

        for player in players:
            player_stats = stats.get(player.player_id, PlayerMatchStats())
            modules = self._modules_for_player(player, player_stats, adjusted_passrank[player.player_id], average_adjusted)
            rating = _clamp(5.0 + sum(module.points for module in modules), 0.0, 10.0)
            explanation = self._explain(player, rating, modules)
            ratings[player.player_id] = PlayerRating(
                player_id=player.player_id,
                player_name=player.name,
                rating=round(rating, 2),
                passrank=round(raw_passrank[player.player_id], 6),
                adjusted_passrank=round(adjusted_passrank[player.player_id], 6),
                modules=tuple(modules),
                explanation=explanation,
            )
        return ratings

    def _modules_for_player(
        self,
        player: Player,
        stats: PlayerMatchStats,
        adjusted_passrank: float,
        average_adjusted: float,
    ) -> list[ModuleScore]:
        relative_passrank = adjusted_passrank / average_adjusted
        passrank_points = (relative_passrank - 1.0) * self.weights.passrank_weight
        passrank_points = _clamp(
            passrank_points,
            self.weights.negative_passrank_cap,
            self.weights.passrank_cap,
        )

        defensive_actions = stats.tackles + stats.interceptions + stats.blocks + 0.6 * stats.clearances
        defensive_position_boost = {
            PositionGroup.GK: 0.25,
            PositionGroup.CB: 1.15,
            PositionGroup.FB_WB: 1.05,
            PositionGroup.DM: 1.10,
            PositionGroup.CM: 0.90,
            PositionGroup.AM_WINGER: 0.65,
            PositionGroup.ST: 0.55,
        }[player.position]

        modules = [
            ModuleScore(
                "PassRank",
                passrank_points,
                f"Adjusted PassRank was {relative_passrank:.2f}x the team average after position and pass-context multipliers.",
            ),
            ModuleScore("Goals", stats.goals * self.weights.goal_points, f"{stats.goals} goals scored."),
            ModuleScore("Assists", stats.assists * self.weights.assist_points, f"{stats.assists} assists recorded."),
            ModuleScore(
                "xG/xA",
                stats.xg * self.weights.xg_points + stats.xa * self.weights.xa_points,
                f"Chance quality contribution from {stats.xg:.2f} xG and {stats.xa:.2f} xA.",
            ),
            ModuleScore(
                "Defensive actions",
                defensive_actions * self.weights.defensive_action_points * defensive_position_boost,
                f"{stats.tackles} tackles, {stats.interceptions} interceptions, {stats.blocks} blocks, and {stats.clearances} clearances.",
            ),
            ModuleScore(
                "Goalkeeper saves",
                stats.saves * self.weights.save_points - stats.goals_conceded * self.weights.goal_conceded_penalty,
                f"{stats.saves} saves with {stats.goals_conceded} goals conceded.",
            ),
            ModuleScore(
                "Errors",
                -stats.errors_leading_to_shot * self.weights.error_shot_penalty
                - stats.errors_leading_to_goal * self.weights.error_goal_penalty,
                f"{stats.errors_leading_to_shot} errors led to shots and {stats.errors_leading_to_goal} led to goals.",
            ),
            ModuleScore(
                "Cards",
                -stats.yellow_cards * self.weights.yellow_card_penalty
                - stats.red_cards * self.weights.red_card_penalty,
                f"{stats.yellow_cards} yellow cards and {stats.red_cards} red cards.",
            ),
        ]
        return modules

    def _explain(self, player: Player, rating: float, modules: Sequence[ModuleScore]) -> str:
        positive = [module for module in modules if module.points > 0.005]
        negative = [module for module in modules if module.points < -0.005]
        neutral = [module for module in modules if -0.005 <= module.points <= 0.005]

        parts = [
            f"{player.name} ({player.position.value}) received a {rating:.2f}/10 rating.",
            "Positive drivers: " + _summarize_modules(positive) if positive else "Positive drivers: none above baseline.",
            "Negative drivers: " + _summarize_modules(negative) if negative else "Negative drivers: none.",
        ]
        if neutral:
            parts.append("Neutral modules: " + ", ".join(module.name for module in neutral) + ".")
        return " ".join(parts)


def _summarize_modules(modules: Sequence[ModuleScore]) -> str:
    return "; ".join(
        f"{module.name} ({module.points:+.2f}: {module.explanation})" for module in modules
    ) + "."


def _clamp(value: float, minimum: float, maximum: float) -> float:
    if not isfinite(value):
        raise ValueError("rating values must be finite")
    return max(minimum, min(maximum, value))
