package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.microsoft.playwright.junit.UsePlaywright;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@UsePlaywright
public class ExampleE2ETest extends FrontendTest {

    @Test
    void logsInWhenPrompted(Page page) {
        useDesktopViewport(page);
        ensureLoggedInIfNeeded(page);

        page.locator("[data-testid='logout-button']").waitFor();
        assertThat(page.title()).isEqualTo("minigame-platform");
        assertThat(page.url()).doesNotEndWith("/login");
    }

    @Test
    void filtersGamesFromHeaderSearch(Page page) {
        useDesktopViewport(page);
        ensureLoggedInIfNeeded(page);

        page.locator("[data-testid='logout-button']").waitFor();
        page.locator("[data-testid='game-library-heading']").waitFor();

        page.locator("[data-testid='header-search']").fill("sudoku");
        page.waitForFunction("""
                () => {
                    const heading = document.querySelector('[data-testid="game-library-heading"]');
                    return !!heading
                        && heading.textContent?.toLowerCase().includes('sudoku');
                }
                """);

        assertThat(page.locator("[data-testid='game-library-heading']").innerText())
                .contains("Filtered Games")
                .contains("sudoku");
        assertThat(page.locator("[data-testid='game-card-sudoku']").isVisible()).isTrue();
        assertThat(page.locator("[data-testid='game-card-battleship']").count()).isZero();
    }

}
