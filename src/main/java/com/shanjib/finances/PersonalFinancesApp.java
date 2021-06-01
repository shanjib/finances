package com.shanjib.finances;

import com.shanjib.finances.data.repo.CustomRepositoryImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Slf4j
@SpringBootApplication
@EnableJpaRepositories(repositoryBaseClass = CustomRepositoryImpl.class)
public class PersonalFinancesApp {

  public static void main(final String[] args) {
    log.info("test");
    try {
      SpringApplication.run(PersonalFinancesApp.class, args);
    } catch (Exception e) {
      log.error("Unable to start application context: ", e);
    }
  }
}
