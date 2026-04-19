package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BattleshipE2ETest extends FrontendTest {

    @Test
    void opensLocalBattleshipMatch(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "battleship");

        page.locator("[data-testid='battleship-local-2p-button']").click();
        page.locator("[data-testid='battleship-mode-label']").waitFor();

        assertThat(page.url().toLowerCase()).contains("/games/battleship");
        assertThat(page.locator("[data-testid='battleship-mode-label']").innerText())
                .contains("LOCAL MULTIPLAYER")
                .contains("2 PLAYERS");
    }
}


