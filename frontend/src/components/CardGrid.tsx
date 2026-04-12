import GameCard from "@/components/GameCard"

export default function CardGrid() {
  // Static UI-only example cards
    const games = [
        {
            "title":"chess",
            "thumbnail":"chess_thumbnail.jpg",
            "genre": ["strategy", "board"]
        },
        {
            "title":"checkers",
            "thumbnail":"checkers_thumbnail.jfif",
            "genre": ["strategy", "board"]
        },
        {
          "title":"knockout",
          "thumbnail":"knockout_thumbnail.png",
          "genre": ["arcade", "action"]
        }
    ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Game Library</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {games.map((g, idx) => (
          <GameCard key={idx} {...g} />
        ))}
      </div>
    </div>
  )
}
