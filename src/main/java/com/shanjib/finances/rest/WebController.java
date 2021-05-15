package com.shanjib.finances.rest;

import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.GetMapping;

@AllArgsConstructor
@Controller
@ControllerAdvice
public class WebController {

  @GetMapping("/home")
  public String home(final ModelMap model) {
    model.addAttribute("test", "asdfklaj;sdf");
    return "home";
  }
}
