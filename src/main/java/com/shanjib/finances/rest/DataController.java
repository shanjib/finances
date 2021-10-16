package com.shanjib.finances.rest;

import com.shanjib.finances.data.service.AccountService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.GetMapping;

@AllArgsConstructor
@Controller
@ControllerAdvice
public class DataController {

  private AccountService accountService;

  @GetMapping("/")
  public String home(final ModelMap model) {
    model.addAttribute("accounts", accountService.getAllAccounts());
    return "home";
  }
}
