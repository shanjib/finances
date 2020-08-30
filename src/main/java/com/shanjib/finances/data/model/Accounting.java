package com.shanjib.finances.data.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.NoArgsConstructor;

@NoArgsConstructor
//@Builder
public class Accounting {

  private String name;
  private BigDecimal balance;
  private LocalDate date;
  private List<Transaction> transactions;
}
