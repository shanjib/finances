package com.shanjib.finances.data.model;

public enum CreditDebitCode {
  CREDIT,
  DEBIT;

  public static CreditDebitCode getEnum(String creditDebit) {
    switch(creditDebit) {
      case "C":
      case "c":
      case "CREDIT":
      case "credit":
        return CREDIT;
      case "D":
      case "d":
      case "DEBIT":
      case "debit":
        return DEBIT;
      default:
        return null;
    }
  }
}
