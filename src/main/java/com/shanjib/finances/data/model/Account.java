package com.shanjib.finances.data.model;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
public class Account implements Serializable {

  @Id
  private String name;
  private BigDecimal balance;
  @ElementCollection(fetch = FetchType.EAGER)
  private List<Transaction> transactions;
}