package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@UsePlaywright
class ChessE2ETest extends FrontendTest {

    @Test
    void opensChessFromHomepage(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "chess");

        assertThat(page.url().toLowerCase()).contains("/games/chess");
        page.locator("[data-testid='game-main-menu-title']").waitFor();
        assertThat(page.locator("[data-testid='game-main-menu-title']").innerText()).contains("Chess");
    }
}


