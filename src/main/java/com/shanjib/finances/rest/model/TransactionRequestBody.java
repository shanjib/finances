package com.shanjib.finances.rest.model;

import lombok.Data;
import org.h2.util.StringUtils;

@Data
public class TransactionRequestBody {

  private String accountName;
  private String date;
  private String description;
  private String amount;
  private String creditDebit;

  public boolean isNullOrEmpty() {
    return StringUtils.isNullOrEmpty(accountName)
        || StringUtils.isNullOrEmpty(date)
        || StringUtils.isNullOrEmpty(description)
        || StringUtils.isNullOrEmpty(amount)
        || StringUtils.isNullOrEmpty(creditDebit)
        ;
  }
}
