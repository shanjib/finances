package com.shanjib.finances.data.model;

public enum TransactionType {
  CREDIT,
  DEBIT,
  TRANSFER;

  public static TransactionType getEnum(String txnType) {
    txnType = txnType.toLowerCase();
    switch(txnType) {
      case "c":
      case "credit":
        return CREDIT;
      case "d":
      case "debit":
        return DEBIT;
      case "t":
      case "transfer":
        return TRANSFER;
      default:
        return null;
    }
  }
}
