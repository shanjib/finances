package com.shanjib.finances.utils;

import java.time.Month;

public class DateHelper {


  public static Month getMonth(final String monthStr) {
    switch (monthStr.toLowerCase()) {
      case "january":
      case "jan":
        return Month.JANUARY;
      case "february":
      case "feb":
        return Month.FEBRUARY;
      case "march":
      case "mar":
        return Month.MARCH;
      case "april":
      case "apr":
        return Month.APRIL;
      case "may":
        return Month.MAY;
      case "june":
      case "jun":
        return Month.JUNE;
      case "july":
      case "jul":
        return Month.JULY;
      case "august":
      case "aug":
        return Month.AUGUST;
      case "september":
      case "sep":
        return Month.SEPTEMBER;
      case "october":
      case "oct":
        return Month.OCTOBER;
      case "november":
      case "nov":
        return Month.NOVEMBER;
      case "december":
      case "dec":
        return Month.DECEMBER;
      default:
        return null;
    }
  }
}
