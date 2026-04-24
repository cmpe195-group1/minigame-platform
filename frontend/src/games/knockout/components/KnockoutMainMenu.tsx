import MainMenu from "@/multiplayer/ui/MainMenu";

interface Props {
  onSelectLocal: () => void;
  onSelectRoom: () => void;
}

export default function KnockoutMainMenu({ onSelectLocal, onSelectRoom }: Props) {
    return  <>
        <MainMenu name="Knockout" onSelectLocal={ onSelectLocal } onSelectRoom={onSelectRoom}/>
    </>
}