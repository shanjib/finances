package com.shanjib.finances.utils;

import com.shanjib.finances.data.model.CreditDebitCode;
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
    if (CreditDebitCode.CREDIT.equals(txn.getCreditDebitCode()))
      return initialAmount.add(txn.getAmount());

    if (CreditDebitCode.DEBIT.equals(txn.getCreditDebitCode()))
      return initialAmount.subtract(txn.getAmount());

    return BigDecimal.ZERO;
  }
}
