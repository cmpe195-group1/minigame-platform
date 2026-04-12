package cmpe195.group1.minigameplatform.sudoku.backend;

import cmpe195.group1.minigameplatform.SecurityConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.jdbc.autoconfigure.DataSourceAutoConfiguration;
import org.springframework.context.annotation.Import;

@SpringBootApplication(exclude = {
        DataSourceAutoConfiguration.class
})
@Import(SecurityConfiguration.class)
public class SudokuBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SudokuBackendApplication.class, args);
    }
}
