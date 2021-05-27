package com.shanjib.finances.rest;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.service.AccountService;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@AllArgsConstructor
@Controller
@ControllerAdvice
public class WebController {

  private AccountService accountService;

  @GetMapping("/home")
  public String home(final ModelMap model) {
    model.addAttribute("accounts", accountService.getAllAccounts());
    return "home";
  }

  @GetMapping("/transactions/{accountName}")
  public String getTransactions(final ModelMap model, @PathVariable("accountName") String accountName) {
    Account account = accountService.getAccount(accountName);
    model.addAttribute(account);
    return "transactions";
  }

  @GetMapping("/transactions/{accountName}/new")
  public String getNewTransaction(final ModelMap model, @PathVariable("accountName") String accountName) {
    model.addAttribute(new TransactionRequestBody());
    Account account = accountService.getAccount(accountName);
    model.addAttribute(account);
    return "newtransaction";
  }
}
