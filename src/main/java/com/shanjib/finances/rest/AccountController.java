package com.shanjib.finances.rest;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Balance;
import com.shanjib.finances.data.service.AccountService;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@AllArgsConstructor
@Controller
@ControllerAdvice
public class AccountController {

  private AccountService accountService;

  @GetMapping("/accounts/get/{accountName}/{month}")
  public String getBalancesForMonth(final ModelMap model,
      @PathVariable("accountName") String accountName,
      @PathVariable(value = "month", required = false) String month,
      @PathVariable(value = "year", required = false) Integer year) {

    if (year == null) {
      year = LocalDate.now().getYear();
    }
    if (month == null) {
      month = LocalDate.now().getMonth().name();
    }

    List<Balance> balances = accountService.getBalancesAcrossDates(accountName, month, year);
    model.addAttribute("balances", balances);
    return "views/accounts/templates/monthly";
  }

  @GetMapping(value = {
      "/accounts/get",
      "/accounts/get/{month}",
      "/accounts/get/{month}/{year}"
  })
  public String getMonthlyBudget(final ModelMap model,
      @PathVariable(value = "month", required = false) String month,
      @PathVariable(value = "year", required = false) Integer year) {

    if (year == null) {
      year = LocalDate.now().getYear();
    }
    if (month == null) {
      month = LocalDate.now().getMonth().name();
    }

    LinkedHashMap<Account, List<Balance>> balances = accountService
        .getBalancesForAllAccountsAcrossDates(month, year);

    List<LocalDate> dates = balances.values()
        .iterator()
        .next()
        .stream()
        .map(Balance::getDate)
        .collect(Collectors.toList());

    model.addAttribute("balances", balances);
    model.addAttribute("dates", dates);

    return "views/accounts/templates/budget";
  }
}
