import MainMenu from "@/multiplayer/ui/MainMenu";

interface Props {
  onSelectLocal: () => void;
  onSelectRoom: () => void;
}

export default function ChessMainMenu({ onSelectLocal, onSelectRoom }: Props) {
    return  <>
        <MainMenu name="Chess" onSelectLocal={ onSelectLocal } onSelectRoom={onSelectRoom}/>
    </>
}