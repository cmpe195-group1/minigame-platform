import GameCard from "@/components/GameCard"
import { useSearchParams } from "react-router"
import { useState, useMemo } from "react"

export default function CardGrid() {
    const [searchParams] = useSearchParams();
    const searchQuery = (searchParams.get("search") || "").trim().toLowerCase();
    const selectedCategory = (searchParams.get("category") || "").trim().toLowerCase();

  // Static UI-only example cards
    const games = [
        {
            "title":"snake",
            "thumbnail":"game_snake.jfif",
            "genre": ["arcade"]
        },
        {
            "title":"csgo",
            "thumbnail":"game_csgo.jpg",
            "genre": ["fps", "action"]
        },
        {
            "title":"tetris",
            "thumbnail":"game_tetris.png",
            "genre":["puzzle"]
        },{
            "title":"snake",
            "thumbnail":"game_snake.jfif",
            "genre": ["arcade"]
        },
        {
            "title":"csgo",
            "thumbnail":"game_csgo.jpg",
            "genre": ["fps", "action"]
        },
        {
            "title":"tetris",
            "thumbnail":"game_tetris.png",
            "genre":["puzzle"]
        },
        {
            "title":"snake",
            "thumbnail":"game_snake.jfif",
            "genre": ["arcade"]
        },
        {
            "title":"csgo",
            "thumbnail":"game_csgo.jpg",
            "genre": ["fps", "action"]
        },
        {
            "title":"tetris",
            "thumbnail":"game_tetris.png",
            "genre":["puzzle"]
        }
    ];

  const displayedGames = useMemo(() => {
    let result = games;

    // Search filter
    if (searchQuery) {
      result = result.filter((game) =>
        game.title.toLowerCase().includes(searchQuery)
      );
    }

    // Category filter (check if any genre matches the selected category)
    if (selectedCategory) {
      result = result.filter((game) =>
        game.genre.some(g => g.toLowerCase() === selectedCategory)
      );
    }

    return result;
  }, [searchQuery, selectedCategory]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">
        {searchQuery || selectedCategory
          ? `Filtered Games${searchQuery ? ` for "${searchQuery}"` : ""}${selectedCategory ? ` in ${selectedCategory}` : ""}`
          : "Game Library"}
      </h1>

      {displayedGames.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          No games found for "{searchQuery}". Try something else!
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedGames.map((g, idx) => (
            <GameCard key={idx} {...g} />
            ))}
        </div>
      )}
    </div>
  )
}
