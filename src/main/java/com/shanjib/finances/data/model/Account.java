package com.shanjib.finances.data.model;

import java.math.BigDecimal;
import javax.persistence.Entity;
import javax.persistence.Id;
import lombok.Data;

@Data
@Entity
public class Account {

  @Id
  private String name;
  private BigDecimal balance;
}