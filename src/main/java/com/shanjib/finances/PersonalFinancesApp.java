package com.shanjib.finances;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@Slf4j
@SpringBootApplication
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
