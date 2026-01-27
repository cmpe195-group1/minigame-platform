import { useParams } from 'react-router'

export default function GamePage() {
  const { game } = useParams()

  return <p>Game page for: {game}</p>
}
