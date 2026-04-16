package cmpe195.group1.minigameplatform.games.checkers.backend.model;

import java.util.List;

public class CheckersGameState {
    private List<List<CheckersPiece>> board;
    private String turn;
    private CheckersPosition selected;

    public List<List<CheckersPiece>> getBoard() {
        return board;
    }

    public void setBoard(List<List<CheckersPiece>> board) {
        this.board = board;
    }

    public String getTurn() {
        return turn;
    }

    public void setTurn(String turn) {
        this.turn = turn;
    }

    public CheckersPosition getSelected() {
        return selected;
    }

    public void setSelected(CheckersPosition selected) {
        this.selected = selected;
    }
}
