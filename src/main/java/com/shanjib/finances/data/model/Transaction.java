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

@AllArgsConstructor
@Builder
@Data
@Entity
@Embeddable
public class Transaction {

  @Id
  @GeneratedValue
  private long id;
  private String accountName;
  private LocalDate date;
  private String description;
  private BigDecimal amount;
}
