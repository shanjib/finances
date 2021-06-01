package com.shanjib.finances.data.model;

public enum CreditDebitCode {
  CREDIT,
  DEBIT;

  public static CreditDebitCode getEnum(String creditDebit) {
    creditDebit = creditDebit.toLowerCase();
    switch(creditDebit) {
      case "c":
      case "credit":
        return CREDIT;
      case "d":
      case "debit":
        return DEBIT;
      default:
        return null;
    }
  }
}
