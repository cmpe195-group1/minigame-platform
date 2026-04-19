package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SudokuE2ETest extends FrontendTest {

    @Test
    void startsLocalSudokuGame(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "sudoku");

        page.locator("[data-testid='sudoku-local-mode-button']").click();
        page.locator("[data-testid='sudoku-start-local-game']").click();
        page.locator("[data-testid='sudoku-scoreboard']").waitFor();

        assertThat(page.url().toLowerCase()).contains("/games/sudoku");
        assertThat(page.locator("[data-testid='sudoku-scoreboard']").innerText()).contains("SCOREBOARD");
    }
}


