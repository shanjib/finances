package com.shanjib.finances.data.model;

import static com.shanjib.finances.utils.MathHelper.addTransaction;

import com.google.common.collect.Lists;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.Optional;
import lombok.Builder;
import lombok.Data;

@Builder
@Data
public class Balance {

  private String accountName;
  private LocalDate date;
  private BigDecimal balance;
  private Collection<Transaction> transactions;

  public BigDecimal getTotalTransactionAmount() {
    BigDecimal totalAmount = BigDecimal.ZERO;
    for (Transaction txn : Optional.ofNullable(transactions).orElse(Lists.newArrayList())) {
      totalAmount = addTransaction(totalAmount, txn);
    }
    return totalAmount;
  }
}
