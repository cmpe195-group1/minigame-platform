package cmpe195.group1.minigameplatform.rest;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * This class handles all requests not requiring authentication.
 */
@RestController
@Tag(name = "Public", description = "No Authentication Required.")
public class PublicController {

    @GetMapping("/")
    public String index() {
        return "Welcome to the Minigame Platform API!";
    }

    @GetMapping(path = "/ping", produces = "text/plain")
    public String ping(HttpServletRequest request) {
        var headers = new StringBuilder();
        request.getHeaderNames().asIterator().forEachRemaining(headerName -> {
            headers.append(headerName).append(": ");
            request.getHeaders(headerName).asIterator().forEachRemaining(headers::append);
            headers.append("\n\t");
        });
        return "Pong" +
                "\nRequest URL: " + request.getRequestURL() +
                "\nRequest URI: " + request.getRequestURI() +
                "\nScheme:      " + request.getScheme() +
                "\nServer Name: " + request.getServerName() +
                "\nServer Port: " + request.getServerPort() +
                "\nIs Secure:   " + request.isSecure() +
                "\nHeaders:\n\t" + headers;
    }

}
