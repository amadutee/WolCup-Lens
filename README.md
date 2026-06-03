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
