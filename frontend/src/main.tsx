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
// import SudokuPage from "@/pages/SudokuPage";
// import ArcheryPage from "@/pages/ArcheryPage";

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
                    {/* <Route path="/games/Sudoku" element={<SudokuPage />} />
                    <Route path="/games/Archery" element={<ArcheryPage />} /> */}
                </Routes>
            </main>
        </div>
    </BrowserRouter>
  </StrictMode>,
)

// function AppLayout() {
//   const location = useLocation();
  
//   // Hide header on game pages
//   const hideHeaderOn = ["/games/archery", "/games/sudoku"];
//   const hideHeader = hideHeaderOn.includes(location.pathname);

//   return (
//     <div className="bg-blue-900 text-white min-h-screen">
//       {!hideHeader && <Header />}
//       {/* <NavBar /> */}
//       <main className="px-6 py-6 max-w-7xl mx-auto">
//         <Routes>
//           <Route path="/" element={<Home />} />
//           <Route path="/games" element={<Games />} />
//           <Route path="/games/search" element={<Search />} />
//           <Route path="/games/:game" element={<GamePage />} />
//           <Route path="/login" element={<LoginPage />} />
//           <Route path="/register" element={<RegisterPage />} />
//           <Route path="/games/Sudoku" element={<SudokuPage />} />
//           <Route path="/games/Archery" element={<ArcheryPage />} />
//         </Routes>
//       </main>
//     </div>
//   );
// }

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <BrowserRouter>
//       <AppLayout />
//     </BrowserRouter>
//   </StrictMode>
// );
