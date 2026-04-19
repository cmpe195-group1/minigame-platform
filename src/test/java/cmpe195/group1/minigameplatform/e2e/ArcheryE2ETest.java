package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@UsePlaywright
class ArcheryE2ETest extends FrontendTest {

    @Test
    void opensArcheryFromHomepage(Page page) {
        useDesktopViewport(page);
        openGameFromHome(page, "archery");

        assertThat(page.url().toLowerCase()).contains("/games/archery");
        page.locator("[data-testid='archery-lobby-title']").waitFor();
        assertThat(page.locator("[data-testid='archery-lobby-title']").innerText()).contains("Archery");
    }
}


