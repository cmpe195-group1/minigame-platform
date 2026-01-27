import { Menu } from "lucide-react"
import { Link } from "react-router"
import styled from "styled-components"

const Container = styled.div`
  position: fixed;
  align-items: center;
  top: 0;
  left: 0;
  right: 0;
  height: 80;
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

const SignInButton = styled.button`
  background: #1e40af;
  padding: 10px 20px;
  border-radius: 8px;
  font-family: 'Bungee', cursive;
  font-size: 14px;
  font-weight: bold;
  transition: background 0.3s;

  &:hover {
    background: #2563eb;
    transform: translateY(-1px);
  }
`;

const RegisterButton = styled.button`
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
`;


export default function Header() {
  return (
    <header>
      <Container>
        {/* Left Section: Hamburger + Logo */}
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-md hover:bg-blue-800">
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
            placeholder="Search games..."
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
          <SignInButton>
            <Link to="/login">Sign In</Link>
          </SignInButton>
          <RegisterButton>
            <Link to="/register">Register</Link>
          </RegisterButton>
        </div>
      </Container>
    </header>
  )
}
