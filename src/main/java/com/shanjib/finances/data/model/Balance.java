package com.shanjib.finances.data.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class Balance {

  private LocalDate date;
  private BigDecimal balance;
  private List<Transaction> transactions;

}
