package com.shanjib.finances.utils;

import org.h2.util.StringUtils;

public class StringHelper {

  public static boolean validateArguments(String... args) {
    for (String arg : args) {
      if (StringUtils.isNullOrEmpty(arg)) {
        return true;
      }
    }
    return false;
  }
}
