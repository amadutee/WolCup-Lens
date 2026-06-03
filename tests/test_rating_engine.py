import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from wolcup_lens import (
    POSITION_MULTIPLIERS,
    PassEvent,
    Player,
    PlayerMatchStats,
    PlayerRatingEngine,
    PositionGroup,
)


class RatingEngineTest(unittest.TestCase):
    def test_edge_weights_are_passer_distribution_percentages(self):
        players = [
            Player("a", "A", PositionGroup.CM),
            Player("b", "B", PositionGroup.CM),
            Player("c", "C", PositionGroup.CM),
        ]
        passes = [
            PassEvent("a", "b", True, 40, 50, 50, 50),
            PassEvent("a", "b", True, 40, 50, 50, 50),
            PassEvent("a", "c", True, 40, 50, 50, 50),
            PassEvent("a", "c", False, 40, 50, 50, 50),
        ]

        result = PlayerRatingEngine().rate_match(players, passes)

        self.assertAlmostEqual(result.edge_weights[("a", "b")], 2 / 3)
        self.assertAlmostEqual(result.edge_weights[("a", "c")], 1 / 3)
        self.assertNotIn(("a", None), result.edge_weights)

    def test_important_receiver_gets_higher_passrank(self):
        players = [
            Player("cb", "Centre Back", PositionGroup.CB),
            Player("cm", "Midfielder", PositionGroup.CM),
            Player("st", "Striker", PositionGroup.ST),
        ]
        passes = [
            PassEvent("cb", "cm", True, 25, 50, 45, 50),
            PassEvent("cb", "cm", True, 26, 48, 44, 49),
            PassEvent("cm", "st", True, 50, 50, 75, 50),
            PassEvent("st", "cm", True, 76, 50, 58, 50),
        ]

        result = PlayerRatingEngine().rate_match(players, passes)

        self.assertGreater(result.raw_passrank["cm"], result.raw_passrank["cb"])
        self.assertGreater(result.adjusted_passrank["st"], result.raw_passrank["st"])

    def test_rating_combines_all_requested_modules_and_explains_output(self):
        players = [Player("st", "Clinical Striker", PositionGroup.ST)]
        stats = {
            "st": PlayerMatchStats(
                goals=2,
                assists=1,
                xg=1.4,
                xa=0.6,
                tackles=1,
                saves=0,
                errors_leading_to_shot=1,
                yellow_cards=1,
            )
        }

        rating = PlayerRatingEngine().rate_match(players, [], stats).ratings["st"]
        module_names = {module.name for module in rating.modules}

        self.assertEqual(
            module_names,
            {
                "PassRank",
                "Goals",
                "Assists",
                "xG/xA",
                "Defensive actions",
                "Goalkeeper saves",
                "Errors",
                "Cards",
            },
        )
        self.assertGreaterEqual(rating.rating, 0)
        self.assertLessEqual(rating.rating, 10)
        self.assertIn("Clinical Striker", rating.explanation)
        self.assertIn("Positive drivers", rating.explanation)
        self.assertIn("Negative drivers", rating.explanation)

    def test_position_multipliers_match_requested_values(self):
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.GK], 0.55)
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.CB], 0.65)
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.FB_WB], 0.80)
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.DM], 0.90)
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.CM], 1.00)
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.AM_WINGER], 1.15)
        self.assertEqual(POSITION_MULTIPLIERS[PositionGroup.ST], 1.20)


if __name__ == "__main__":
    unittest.main()
