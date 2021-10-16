package com.shanjib.finances.utils;

import com.shanjib.finances.data.model.Transaction;
import java.math.BigDecimal;
import java.util.List;

public class MathHelper {

  public static BigDecimal addTransaction(final BigDecimal initialAmount, final List<Transaction> txns) {
    BigDecimal balance = initialAmount;
    for (Transaction txn : txns) {
      balance = addTransaction(balance, txn);
    }
    return balance;
  }

  public static BigDecimal addTransaction(final BigDecimal initialAmount, final Transaction txn) {
    switch (txn.getTransactionType()) {
      case CREDIT:
      case TRANSFER:
        return initialAmount.add(txn.getAmount());
      case DEBIT:
        return initialAmount.subtract(txn.getAmount());
      default:
        return BigDecimal.ZERO;
    }
  }
}
