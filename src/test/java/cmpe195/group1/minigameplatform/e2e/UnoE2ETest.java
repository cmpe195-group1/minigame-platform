package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@UsePlaywright
class UnoE2ETest extends FrontendTest {

    @Test
    void startsLocalUnoMatch(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "uno");

        page.locator("[data-testid='uno-mode-local']").click();
        page.locator("[data-testid='uno-player-name-1']").fill("Player One");
        page.locator("[data-testid='uno-player-name-2']").fill("Player Two");
        page.locator("[data-testid='uno-start-local-game']").click();
        page.locator("[data-testid='uno-local-handoff']").waitFor();

        assertThat(page.url().toLowerCase()).contains("/games/uno");
        assertThat(page.locator("[data-testid='uno-local-handoff']").innerText()).contains("Hand the device to");
        assertThat(page.locator("[data-testid='uno-ready-for-reveal']").isVisible()).isTrue();
    }
}

