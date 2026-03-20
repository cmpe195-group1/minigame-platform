import {StrictMode} from "react"
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route  } from 'react-router'
import './globals.css'
import Header from '@/components/PageHeader'
import NavBar from '@/components/NavBar'
import Home from '@/pages/Home'
import Games from '@/pages/Games'
import GamePage from '@/pages/GamePage'
import Search from '@/pages/Search'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import PhaserTest from "./components/PhaserTest"
import ChessGameWrapper from "./games/chess/ChessGameWrapper"
import CheckersGameWrapper from "./games/checkers/CheckersGameWrapper"
import AirHockeyGameWrapper from "./games/airhockey/AirHockeyGameWrapper"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
        <div className="bg-blue-900 text-white min-h-screen">
            <Header />
            {/* <NavBar /> */}
            <main className="px-6 py-6 max-w-7xl mx-auto">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/games/search" element={<Search />} />
                    <Route path="/games/:game" element={<GamePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/chess" element={<ChessGameWrapper />} />
                    <Route path="/checkers" element={<CheckersGameWrapper />} />
                    <Route path="/airhockey" element={<AirHockeyGameWrapper />} />
                    <Route path="*" element={<h1>404 Not Found</h1>} />
                </Routes>
            </main>
        </div>
    </BrowserRouter>
  </StrictMode>,
)
