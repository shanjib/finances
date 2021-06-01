package com.shanjib.finances.rest;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.service.AccountService;
import com.shanjib.finances.data.service.TransactionService;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ModelMap;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;

@AllArgsConstructor
@Controller
@ControllerAdvice
public class WebController {

  private AccountService accountService;
  private TransactionService transactionService;

  @GetMapping("/")
  public String home(final ModelMap model) {
    model.addAttribute("accounts", accountService.getAllAccounts());
    return "home";
  }

  @GetMapping("/transactions/{accountName}")
  public String getTransactions(final ModelMap model, @PathVariable("accountName") String accountName) {
    Account account = accountService.getAccount(accountName);
    if (account != null) {
      model.addAttribute(account);
      return "views/transactions/templates/transactions";
    } else {
      model.addAttribute("errorMsg", "Failed to find account");
      return "home";
    }
  }

  @GetMapping("/transactions/{accountName}/new")
  public String getNewTransaction(final ModelMap model, @PathVariable("accountName") String accountName) {
    model.addAttribute(new TransactionRequestBody());
    Account account = accountService.getAccount(accountName);
    model.addAttribute(account);
    model.addAttribute("today", LocalDate.now());
    return "views/transactions/templates/newtransaction";
  }

  @PostMapping(path = "/transactions/new")
  public String addTransaction(final ModelMap model, final TransactionRequestBody body) {
    if (!transactionService.addTransaction(body)) {
      model.addAttribute("errorMsg", "Failed to add transaction");
    }
    return getTransactions(model, body.getAccountName());
  }
}
