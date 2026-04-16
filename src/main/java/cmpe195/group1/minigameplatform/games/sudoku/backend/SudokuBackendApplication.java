/*package cmpe195.group1.minigameplatform.games.sudoku.backend;

import cmpe195.group1.minigameplatform.SecurityConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Import;

@SpringBootApplication(
    exclude = { DataSourceAutoConfiguration.class },
    scanBasePackages = {
        "cmpe195.group1.minigameplatform.games.sudoku.backend",
        "cmpe195.group1.minigameplatform.games.checkers.backend"
    }
)
@Import(SecurityConfiguration.class)
public class SudokuBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SudokuBackendApplication.class, args);
    }
}*/