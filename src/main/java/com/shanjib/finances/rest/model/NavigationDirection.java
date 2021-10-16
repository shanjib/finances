package com.shanjib.finances.rest.model;

public enum NavigationDirection {
  NEXT,
  PREVIOUS;

  public static NavigationDirection getEnum(String direction) {
    direction = direction.toLowerCase();
    switch (direction) {
      case "next":
      case "forward":
        return NEXT;
      case "previous":
      case "back":
        return PREVIOUS;
      default:
        return null;
    }
  }
}
