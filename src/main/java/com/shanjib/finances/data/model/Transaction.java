package com.shanjib.finances.data.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import javax.persistence.Embeddable;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NonNull;

@AllArgsConstructor
@Builder
@Data
@Entity
@Embeddable
public class Transaction implements Comparable<Transaction>{

  @Id
  @GeneratedValue
  private long id;
  private long accountId;
  private String accountName;
  @NonNull
  private LocalDate date;
  private String description;
  @NonNull
  private BigDecimal amount;
  @NonNull
  private TransactionType transactionType;

  @Override
  public int compareTo(Transaction other) {
    return this.date.compareTo(other.getDate());
  }
}
