package com.shanjib.finances.utils;

import org.h2.util.StringUtils;

public class StringHelper {

  public static boolean validateArguments(String... args) {
    for (int i = 0; i < args.length; i++) {
      if (StringUtils.isNullOrEmpty(args[i])) {
        return false;
      }
    }
    return true;
  }
}
