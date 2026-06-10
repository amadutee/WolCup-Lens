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

Switch providers with the server-only deployment variable, or with the public variable for local development:

```bash
RATING_PROVIDER=sample
RATING_PROVIDER=api-football
RATING_PROVIDER=statsbomb-advanced

# Local/browser-exposed fallback also works:
NEXT_PUBLIC_RATING_PROVIDER=api-football
```

- `sample` is the local-development default and adapts the existing mock match data to the shared `PlayerRatingProvider` interface.
- `api-football` uses API-Football aggregate player stats when `API_FOOTBALL_API_KEY` is available, then scores attacking, playmaking, possession, defensive, goalkeeper, and discipline categories rather than pass-network PageRank.
- `statsbomb-advanced` assumes StatsBomb-style event JSON and builds a weighted passer-to-recipient graph for PageRank-style influence, plus event modules for xG chain, goals, assists, shot assists, defensive actions, pressures, and ball recoveries.

To connect API-Football/API-Sports in deployment, keep the secret key server-side and select the provider with the server-only variable:

```bash
API_FOOTBALL_API_KEY=your_api_sports_key
RATING_PROVIDER=api-football
```

`NEXT_PUBLIC_RATING_PROVIDER=api-football` is still supported as a local-development fallback, but deployments should prefer `RATING_PROVIDER` because `NEXT_PUBLIC_*` variables can be inlined at build time by Next.js hosting providers.

When the resolved rating provider is `api-football`, the Matches page also loads live and upcoming fixtures from API-Football so match route ids are numeric API fixture ids by default. If the resolved provider is `sample`, including a server-side `NEXT_PUBLIC_RATING_PROVIDER=sample` fallback, the Matches page uses the bundled sample matches. API-Football fixture discovery defaults to World Cup league `1`, season `2026`, and the next `10` fixtures; override those with `API_FOOTBALL_LEAGUE_ID`, `API_FOOTBALL_SEASON`, and `API_FOOTBALL_UPCOMING_COUNT`.

If the app route id is not the numeric API-Football fixture id, map the local match id to the fixture id with a comma-separated list:

```bash
API_FOOTBALL_FIXTURE_ID_MAP=arg-fra-live:123456,esp-usa-recent:789012
```

When API-Football team ids differ from the app's local team ids, map them as well:

```bash
API_FOOTBALL_TEAM_ID_MAP=50:arg,49:fra
```

`API_FOOTBALL_BASE_URL` can override the default `https://v3.football.api-sports.io` for tests or proxies. In production, missing API keys, missing fixture ids, or empty API player-stat responses now throw instead of silently using sample data. Set `API_FOOTBALL_ALLOW_SAMPLE_FALLBACK=true` only when you intentionally want sample fallback in deployment.

To connect a paid StatsBomb API later, implement a new `StatsBombDataLoader` that returns `{ events, players, threeSixty }` and pass it to `StatsBombAdvancedRatingProvider`; the rest of the app can continue calling `getRatingProvider()` unchanged.

Run the TypeScript provider tests with:

```bash
npm run test:ratings
```
