package cmpe195.group1.minigameplatform.sudoku.backend.model;

public class SudokuCell {
    private int row;
    private int col;
    private int value;
    private boolean isGiven;
    private Integer playerId;
    private Boolean isCorrect;
    private int solvedValue;

    public SudokuCell() {
    }

    public SudokuCell(int row, int col, int value, boolean isGiven, Integer playerId, Boolean isCorrect, int solvedValue) {
        this.row = row;
        this.col = col;
        this.value = value;
        this.isGiven = isGiven;
        this.playerId = playerId;
        this.isCorrect = isCorrect;
        this.solvedValue = solvedValue;
    }

    public int getRow() {
        return row;
    }

    public void setRow(int row) {
        this.row = row;
    }

    public int getCol() {
        return col;
    }

    public void setCol(int col) {
        this.col = col;
    }

    public int getValue() {
        return value;
    }

    public void setValue(int value) {
        this.value = value;
    }

    public boolean isGiven() {
        return isGiven;
    }

    public void setGiven(boolean given) {
        isGiven = given;
    }

    public Integer getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Integer playerId) {
        this.playerId = playerId;
    }

    public Boolean getIsCorrect() {
        return isCorrect;
    }

    public void setIsCorrect(Boolean correct) {
        isCorrect = correct;
    }

    public int getSolvedValue() {
        return solvedValue;
    }

    public void setSolvedValue(int solvedValue) {
        this.solvedValue = solvedValue;
    }
}
