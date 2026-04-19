package cmpe195.group1.minigameplatform.e2e;

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

    @BeforeAll
    static void setup() throws IOException {
        frontendServer = new FrontendServer(Path.of("frontend/dist").toRealPath(), 8001);
        frontendServer.start();
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
