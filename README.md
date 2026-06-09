# WolCup Lens

WolCup Lens contains a player rating engine inspired by PageRank. It turns a match passing network and event totals into 0-10 player ratings with explanations.

## PassRank model

For each match:

1. Every player is a node.
2. Completed passes are directed edges from passer to receiver.
3. Edge weight is the percentage of one player's completed passes that went to another player.
4. A PageRank-style iteration rewards players who receive passes from already-important players.
5. Raw PassRank is adjusted by:
   - position multiplier,
   - pass location,
   - pass direction,
   - progressive pass value,
   - final-third involvement,
   - low-value defensive recycling penalty.

Position multipliers are:

| Position | Multiplier |
| --- | ---: |
| GK | 0.55 |
| CB | 0.65 |
| FB/WB | 0.80 |
| DM | 0.90 |
| CM | 1.00 |
| AM/Winger | 1.15 |
| ST | 1.20 |

## Rating modules

The final rating starts from 5.0, adds the adjusted PassRank contribution, then applies separate modules for:

- goals,
- assists,
- xG and xA,
- defensive actions,
- goalkeeper saves,
- errors,
- yellow/red cards.

Ratings are clamped to a 0-10 scale. Each player output includes the raw PassRank, adjusted PassRank, module contributions, and a natural-language explanation.

## Example

```python
from wolcup_lens import PassEvent, Player, PlayerMatchStats, PlayerRatingEngine, PositionGroup

players = [
    Player("cm", "Central Midfielder", PositionGroup.CM),
    Player("st", "Striker", PositionGroup.ST),
    Player("cb", "Centre Back", PositionGroup.CB),
]

passes = [
    PassEvent("cb", "cm", True, 25, 50, 48, 52),
    PassEvent("cm", "st", True, 52, 52, 78, 48),
    PassEvent("st", "cm", True, 79, 48, 60, 50),
]

stats = {
    "st": PlayerMatchStats(goals=1, xg=0.7),
    "cm": PlayerMatchStats(assists=1, xa=0.4, tackles=2),
}

result = PlayerRatingEngine().rate_match(players, passes, stats)
print(result.ratings["st"].rating)
print(result.ratings["st"].explanation)
```

## Website rating providers

The Next.js app reads player ratings through `getRatingProvider()` in `src/config/ratingProvider.ts`, so UI routes do not need to know whether ratings come from mock data, API-Football aggregates, or StatsBomb events.

Switch providers with:

```bash
NEXT_PUBLIC_RATING_PROVIDER=sample
NEXT_PUBLIC_RATING_PROVIDER=api-football
NEXT_PUBLIC_RATING_PROVIDER=statsbomb-advanced
```

- `sample` is the local-development default and adapts the existing mock match data to the shared `PlayerRatingProvider` interface.
- `api-football` assumes API-Football-style aggregate player stats only, so it uses weighted scoring for attacking, playmaking, possession, defensive, goalkeeper, and discipline categories rather than pass-network PageRank.
- `statsbomb-advanced` assumes StatsBomb-style event JSON and builds a weighted passer-to-recipient graph for PageRank-style influence, plus event modules for xG chain, goals, assists, shot assists, defensive actions, pressures, and ball recoveries.

To connect a paid StatsBomb API later, implement a new `StatsBombDataLoader` that returns `{ events, players, threeSixty }` and pass it to `StatsBombAdvancedRatingProvider`; the rest of the app can continue calling `getRatingProvider()` unchanged.

Run the TypeScript provider tests with:

```bash
npm run test:ratings
```
