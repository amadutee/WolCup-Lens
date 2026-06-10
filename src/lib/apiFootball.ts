const API_BASE = "https://v3.football.api-sports.io";

export async function apiFootballFetch(path: string) {

  const response = await fetch(
    `${API_BASE}${path}`,
    {
      headers: {
        "x-apisports-key":
          process.env.API_FOOTBALL_API_KEY!
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      `API Football error: ${response.status}`
    );
  }

  return response.json();
}
