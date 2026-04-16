
import SudokuPage from "@/pages/SudokuPage";
import ArcheryPage from "@/pages/ArcheryPage";
import BattleshipPage from "@/pages/BattleshipPage";
import ChessGameWrapper from "./games/chess/ChessGameWrapper";
import KnockoutGameWrapper from "./games/knockout/KnockoutGameWrapper";
import CheckersPage from "./pages/CheckersPage"
import {StrictMode, useEffect} from "react"
import {createRoot} from "react-dom/client"
import {BrowserRouter, Navigate, Outlet, Route, Routes} from "react-router"
import "./globals.css"
import Header from "@/components/PageHeader"
import Home from "@/pages/Home"
import Games from "@/pages/Games"
import Search from "@/pages/Search"
import LoginPage from "@/pages/LoginPage"
import RegisterPage from "@/pages/RegisterPage"
import Trivia from "@/games/trivia/Trivia.tsx"
import Anagrams from "@/games/anagrams/Anagrams.tsx"
import Uno from "@/games/uno/Uno.tsx";
import {type AuthSnapshot, signOutUser, startAuthListener, useAuthSnapshot} from "@/auth"

function RequireAuth({ auth }: { auth: AuthSnapshot }) {
  if (auth.initializing) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center text-blue-100">
        Checking your session...
      </div>
    )
  }

  if (!auth.user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function App() {
  const auth = useAuthSnapshot()

  useEffect(() => {
    return startAuthListener()
  }, [])

  return (
    <BrowserRouter>
      <div className="bg-blue-900 text-white min-h-screen">
        <Header auth={auth} onLogout={signOutUser} />
        <main className="px-6 py-6 mt-20 max-w-7xl mx-auto">
          <Routes>
            <Route path="/login" element={<LoginPage auth={auth} />} />
            <Route path="/register" element={<RegisterPage auth={auth} />} />
            <Route element={<RequireAuth auth={auth} />}>
              <Route path="/" element={<Home />} />
              <Route path="/games" element={<Games />} />
              <Route path="/games/search" element={<Search />} />
              <Route path="/games/sudoku" element={<SudokuPage />} />
              <Route path="/games/archery" element={<ArcheryPage />} />
              <Route path="/games/battleship" element={<BattleshipPage />} />
              <Route path="games/chess" element={<ChessGameWrapper />} />
              <Route path="games/knockout" element={<KnockoutGameWrapper />} />
              <Route path="/games/checkers" element={<CheckersPage />} />
              <Route path="/games/search" element={<Search />} />
              <Route path="/games/trivia" element={<Trivia/>} />
              <Route path="/games/anagrams" element={<Anagrams />} />
              <Route path="/games/uno" element={<Uno />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
