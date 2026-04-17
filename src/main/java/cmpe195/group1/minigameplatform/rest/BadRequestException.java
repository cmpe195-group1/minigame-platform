package cmpe195.group1.minigameplatform.rest;

import lombok.experimental.StandardException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * This exception is intended to be thrown when an error occurs that should be visible to the user.
 */
// TODO: proper handling with https://stackoverflow.com/q/67174819/5938387
@StandardException
@ResponseStatus(code = HttpStatus.BAD_REQUEST, reason = "Bad Request")
public class BadRequestException extends RuntimeException {
}
