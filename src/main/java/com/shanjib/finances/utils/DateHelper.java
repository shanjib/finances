package com.shanjib.finances.utils;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeParseException;

public class DateHelper {

  public static Month getMonth(final String monthStr) {
    switch (monthStr.toLowerCase()) {
      case "january":
      case "jan":
      case "1":
        return Month.JANUARY;
      case "february":
      case "feb":
      case "2":
        return Month.FEBRUARY;
      case "march":
      case "mar":
      case "3":
        return Month.MARCH;
      case "april":
      case "apr":
      case "4":
        return Month.APRIL;
      case "may":
      case "5":
        return Month.MAY;
      case "june":
      case "jun":
      case "6":
        return Month.JUNE;
      case "july":
      case "jul":
      case "7":
        return Month.JULY;
      case "august":
      case "aug":
      case "8":
        return Month.AUGUST;
      case "september":
      case "sep":
      case "9":
        return Month.SEPTEMBER;
      case "october":
      case "oct":
      case "10":
        return Month.OCTOBER;
      case "november":
      case "nov":
      case "11":
        return Month.NOVEMBER;
      case "december":
      case "dec":
      case "12":
        return Month.DECEMBER;
      default:
        return null;
    }
  }

  public static LocalDate getNewTransactionDefaultDate(String date) {
    try {
      return LocalDate.parse(date);
    } catch (DateTimeParseException | NullPointerException e) {
      return LocalDate.now();
    }
  }
}
