package cmpe195.group1.minigameplatform.e2e;

import com.microsoft.playwright.Page;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.SimpleFileServer;
import org.junit.jupiter.api.AutoClose;
import org.junit.jupiter.api.BeforeAll;

import java.io.Closeable;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.nio.file.Files;
import java.nio.file.Path;

public abstract class FrontendTest {
    @AutoClose static FrontendServer frontendServer;

    private static final String DEFAULT_LOGIN_EMAIL = "test@example.com";
    private static final String DEFAULT_LOGIN_PASSWORD = "password";

    @BeforeAll
    static void setup() throws IOException {
        frontendServer = new FrontendServer(Path.of("frontend/dist").toRealPath(), 8001);
        frontendServer.start();
    }

    protected String baseUrl() {
        return frontendServer.baseUrl();
    }

    protected void navigateTo(Page page, String path) {
        String normalizedPath = path.startsWith("/") ? path : "/" + path;
        page.navigate(baseUrl() + normalizedPath);
    }

    protected void useDesktopViewport(Page page) {
        page.setViewportSize(1440, 1200);
    }

    protected void ensureLoggedInIfNeeded(Page page) {
        navigateTo(page, "/");
        page.waitForFunction("""
                () => window.location.pathname === '/login'
                    || !!document.querySelector('#login-email')
                    || !!document.querySelector('[data-testid="logout-button"]')
                    || !!document.querySelector('[data-testid="game-library-heading"]')
                """);

        if (!page.url().endsWith("/login")) {
            return;
        }

        page.locator("#login-email").fill(System.getenv().getOrDefault("E2E_EMAIL", DEFAULT_LOGIN_EMAIL));
        page.locator("#login-password").fill(System.getenv().getOrDefault("E2E_PASSWORD", DEFAULT_LOGIN_PASSWORD));
        page.locator("[data-testid='login-submit']").click();

        page.waitForFunction("""
                () => !!document.querySelector('[data-testid="login-error"]')
                    || !!document.querySelector('[data-testid="logout-button"]')
                    || !!document.querySelector('[data-testid="game-library-heading"]')
                    || window.location.pathname !== '/login'
                """);

        if (page.locator("[data-testid='login-error']").isVisible()) {
            throw new IllegalStateException("E2E login failed: " + page.locator("[data-testid='login-error']").innerText());
        }
    }

    protected void openGameFromHome(Page page, String gameSlug) {
        ensureLoggedInIfNeeded(page);
        page.locator("[data-testid='logout-button']").waitFor();
        page.locator("[data-testid='game-library-heading']").waitFor();
        page.locator("[data-testid='game-card-" + gameSlug + "']").scrollIntoViewIfNeeded();
        page.locator("[data-testid='game-card-" + gameSlug + "'] a").click();
        page.waitForFunction("slug => window.location.pathname.toLowerCase() === '/games/' + slug", gameSlug);
    }

    private static final class FrontendServer implements Closeable {

        private static final String INDEX_FILE_NAME = "index.html";

        private final HttpServer httpServer;
        private final Path rootDir;
        private final Path indexFile;
        private final String baseUrl;

        public FrontendServer(Path rootDir, int port) {
            try {
                this.rootDir = rootDir.toRealPath();
            } catch (IOException exception) {
                throw new IllegalArgumentException("Frontend root directory must exist", exception);
            }

            this.indexFile = this.rootDir.resolve(INDEX_FILE_NAME);
            if (!Files.isRegularFile(indexFile)) {
                throw new IllegalArgumentException("Frontend root directory must contain index.html");
            }

            var address = new InetSocketAddress("127.0.0.1", port);
            HttpHandler staticFiles = SimpleFileServer.createFileHandler(this.rootDir);
            HttpHandler spaHandler = exchange -> handleRequest(exchange, staticFiles);

            try {
                this.httpServer = HttpServer.create(address, 0, "/", spaHandler);
            } catch (IOException exception) {
                throw new UncheckedIOException("Failed to create frontend HTTP server", exception);
            }
            this.baseUrl = "http://127.0.0.1:" + port;
        }

        public void start() {
            httpServer.start();
        }

        public void stop() {
            httpServer.stop(0);
        }

        @Override
        public void close() {
            stop();
        }

        public String baseUrl() {
            return baseUrl;
        }

        private void handleRequest(HttpExchange exchange, HttpHandler staticFiles) throws IOException {
            String method = exchange.getRequestMethod();
            if (!"GET".equals(method) && !"HEAD".equals(method)) {
                staticFiles.handle(exchange);
                return;
            }

            if (shouldServeStaticResource(exchange.getRequestURI().getPath())) {
                staticFiles.handle(exchange);
                return;
            }

            serveSpaIndex(exchange, method);
        }

        private boolean shouldServeStaticResource(String requestPath) {
            String normalizedRequestPath = requestPath == null || requestPath.isBlank() ? "/" : requestPath;
            String relativePath = normalizedRequestPath.startsWith("/")
                    ? normalizedRequestPath.substring(1)
                    : normalizedRequestPath;

            Path candidate = rootDir.resolve(relativePath).normalize();
            if (!candidate.startsWith(rootDir)) {
                return true;
            }

            if (Files.exists(candidate)) {
                return true;
            }

            String lastSegment = candidate.getFileName() == null ? "" : candidate.getFileName().toString();
            return lastSegment.contains(".");
        }

        private void serveSpaIndex(HttpExchange exchange, String method) throws IOException {
            exchange.getResponseHeaders().set("Content-Type", "text/html; charset=utf-8");

            if ("HEAD".equals(method)) {
                exchange.sendResponseHeaders(200, -1);
                exchange.close();
                return;
            }
            exchange.sendResponseHeaders(200, Files.size(indexFile));
            try (var responseBody = exchange.getResponseBody()) {
                Files.copy(indexFile, responseBody);
            }
        }
    }
}
