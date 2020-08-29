package com.shanjib.finances.rest.model;

import lombok.Data;

@Data
public class TransactionRequestBody {

  private String accountName;
  private String date;
  private String description;
  private String amount;
}
