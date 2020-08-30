package com.shanjib.finances.rest.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import lombok.Data;
import org.h2.util.StringUtils;

@Data
public class AccountRequestBody {

  private String name;
  private String date;
  private String balance;

  public boolean isNullOrEmpty() {
    return StringUtils.isNullOrEmpty(name);
  }

  public LocalDate getDate() {
    if (StringUtils.isNullOrEmpty(date)) {
      return LocalDate.now();
    }
    return LocalDate.parse(date);
  }

  public BigDecimal getBalance() {
    if (StringUtils.isNullOrEmpty(balance)) {
      return BigDecimal.ZERO;
    }
    return new BigDecimal(balance);
  }
}
