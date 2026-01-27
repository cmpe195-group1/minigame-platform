import styled from "styled-components"

const LeftNavbarContainer = styled.nav`
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 200px 24px;
  width: 256px;
  background: #101420;
  z-index: 40;
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  width: 100%;
`;

const Button = styled.button`
  width: 100%;
  height: 40px;
  background: #12233e;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  font-family: "Bungee", cursive;
  font-size: 16px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:hover {
    background: #1e40af;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Navbar = () => {
  const menuItems = ["HOME", "ALL GAMES", "PUZZLE", "CHESS", "SPORT"];
  return (
    <LeftNavbarContainer>
      <Nav>
        {menuItems.map((item) => (
          <Button key={item}>
            <span>{item}</span>
          </Button>
        ))}
      </Nav>
    </LeftNavbarContainer>
  );
};

export default Navbar;
