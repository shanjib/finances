package com.shanjib.finances.rest.model;

import com.shanjib.finances.utils.DateHelper;
import java.time.LocalDate;
import lombok.Data;

@Data
public class NavigationRequestBody {
  String direction;
  String date;

  public LocalDate getDate() {
    return DateHelper.parseDate(date);
  }

  public NavigationDirection getDirection() {
    return NavigationDirection.getEnum(direction);
  }
}
