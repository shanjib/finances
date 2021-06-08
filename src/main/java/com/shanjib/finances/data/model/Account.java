package com.shanjib.finances.data.model;

import com.google.common.collect.Lists;
import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Entity
public class Account implements Serializable, Comparable<Account> {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;
  private String name;
  private BigDecimal initialBalance;
  private BigDecimal currentBalance = BigDecimal.ZERO;
  @OneToMany(mappedBy = "accountId")
  private Set<Transaction> transactions;

  public List<Transaction> getOrderedTransactions() {
    List<Transaction> txns = Lists.newArrayList(transactions);
    Collections.sort(txns);
    return txns;
  }

  @Override
  public int compareTo(Account o) {
    return this.getName().compareTo(o.getName());
  }
}