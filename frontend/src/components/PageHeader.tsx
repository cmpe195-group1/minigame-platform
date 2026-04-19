import { Menu } from "lucide-react"
import { Link } from "react-router"
import { useEffect, useState } from "react"
import NavBar from "./NavBar"
import { motion, AnimatePresence } from "framer-motion"
import { useSearchParams } from "react-router"
import styled from "styled-components"
import type { AuthSnapshot } from "@/auth"

const Container = styled.div`
  position: fixed;
  align-items: center;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  background: #12233e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-left: 1.5rem;
  padding-right: 1.5rem;
  padding-top: 1rem;
  padding-bottom: 1rem;
  z-index: 50;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  margin-left: auto;
  margin-right: auto;
`;

const ActionLink = styled(Link)`
  background: #1e40af;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: 'Bungee', cursive;
  font-size: 14px;
  font-weight: bold;
  transition: background 0.3s;
  color: white;
  text-decoration: none;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
`;

const RegisterLink = styled(ActionLink)`
  background: #dc2626;

  &:hover {
    background: #ef4444;
    transform: translateY(-1px);
  }
`;

const LogoutButton = styled.button`
  background: #dc2626;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: 'Bungee', cursive;
  font-size: 14px;
  font-weight: bold;
  transition: background 0.3s;

  &:hover {
    background: #ef4444;
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
    transform: none;
  }
`;

type HeaderProps = {
  auth: AuthSnapshot
  onLogout: () => Promise<void>
}


export default function Header({ auth, onLogout }: HeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const currentSearch = searchParams.get("search") || "";

  const [searchInput, setSearchInput] = useState(currentSearch);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // update url query string
    if (!value.trim()) {
      setSearchParams({});
    } else {
      setSearchParams({ search: value });
    }
  };

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const handleLogout = async () => {
    setLogoutError('');
    setIsLoggingOut(true);

    try {
      await onLogout();
    } catch {
      setLogoutError('Unable to log out right now. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const userLabel = auth.user?.email || auth.user?.displayName || 'Signed in';
  
  return (
    <>
      <header>
        <Container>
          {/* Left Section: Hamburger + Logo */}
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-md hover:bg-blue-800" onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle menu">
              <Menu size={24} />
            </button>

            <Link
              to="/"
              style={{
                fontFamily: "Bungee, cursive",
                fontSize: "32px",
                color: "white",
                letterSpacing: "3px",
              }}
            >
              Mini Games
            </Link>
          </div>

          {/* Middle Section: Search */}
          <div className="hidden md:flex flex-1 mx-6">
            <input
              data-testid="header-search"
              placeholder="Search games..."
              value={searchInput}
              onChange={handleSearchChange}
              style={{
                width: "300px",
                height: "40px",
                padding: "0 20px",
                borderRadius: "20px",
                fontFamily: "Bungee, cursive",
                border: "1px solid white",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            />
          </div>

          <div className="flex items-center gap-3">
            {auth.user ? (
              <>
                <span className="hidden text-sm text-blue-100 md:block" data-testid="header-user-label">
                  {userLabel}
                </span>
                <LogoutButton onClick={handleLogout} disabled={isLoggingOut} type="button" data-testid="logout-button">
                  {isLoggingOut ? 'Logging Out...' : 'Logout'}
                </LogoutButton>
              </>
            ) : auth.initializing ? (
              <span className="text-sm text-blue-100">Checking session...</span>
            ) : (
              <>
                <ActionLink to="/login">Sign In</ActionLink>
                <RegisterLink to="/register">Register</RegisterLink>
              </>
            )}
          </div>
        </Container>
        {logoutError ? (
          <div className="bg-red-500/15 px-6 py-2 text-center text-sm text-red-100">
            {logoutError}
          </div>
        ) : null}
      </header>
      <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black z-40"
                onClick={() => setIsSidebarOpen(false)}
              />

              {/* Sidebar */}
              <motion.nav
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.1, ease: "easeOut" }}
                className="fixed left-0 top-0 bottom-0 z-40"
              >
                <NavBar onClose={() => setIsSidebarOpen(false)} />
              </motion.nav>
            </>
          )}
        </AnimatePresence>
    </>
  )
}
