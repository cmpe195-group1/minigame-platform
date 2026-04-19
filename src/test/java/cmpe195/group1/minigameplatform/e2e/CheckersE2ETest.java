package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CheckersE2ETest extends FrontendTest {

    @Test
    void startsLocalCheckersMatch(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "checkers");

        page.locator("[data-testid='checkers-local-mode-button']").click();
        page.locator("[data-testid='local-setup-start']").click();
        page.locator("[data-testid='checkers-local-status']").waitFor();

        assertThat(page.url().toLowerCase()).contains("/games/checkers");
        assertThat(page.locator("[data-testid='checkers-local-status']").innerText())
                .contains("White")
                .contains("Black pieces");
    }
}

