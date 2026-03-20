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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
        <div className="bg-blue-900 text-white min-h-screen">
            <Header />
            <main className="px-6 py-6 mt-20 max-w-7xl mx-auto">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/games" element={<Games />} />
                    <Route path="/games/search" element={<Search />} />
                    <Route path="/games/:game" element={<GamePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                </Routes>
            </main>
        </div>
    </BrowserRouter>
  </StrictMode>,
)
