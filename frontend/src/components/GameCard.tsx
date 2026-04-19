import { Link } from "react-router"

export default function GameCard({ thumbnail, title, fitWhole }: any) {
  const slug = title ? String(title).toLowerCase() : "unknown"

  return (
    <div className="bg-blue-800 rounded-xl overflow-hidden shadow-lg hover:scale-[1.02] transition-all cursor-pointer" data-testid={`game-card-${slug}`}>
      <Link to={`/games/${slug}`}>
        <img
          src={`/game-thumbnails/${thumbnail}`}
          alt={title}
          className={`w-full h-40 ${fitWhole ? "object-contain" : "object-cover"}`}
        />

        <h3 className="mt-3 w-full py-2 text-center">
          {title ? title : "No title"}
        </h3>
      </Link>
    </div>
  )
}
