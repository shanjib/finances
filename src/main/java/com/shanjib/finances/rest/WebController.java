package com.shanjib.finances.rest;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Balance;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.service.AccountService;
import com.shanjib.finances.data.service.TransactionService;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import com.shanjib.finances.utils.DateHelper;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
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

  @GetMapping("/accounts/{accountName}/{month}")
  public String getBalancesForMonth(final ModelMap model,
      @PathVariable("accountName") String accountName, @PathVariable("month") String month) {

    List<Balance> balances = accountService.getBalancesAcrossDates(accountName, month, 2021);
    model.addAttribute("balances", balances);
    return "views/accounts/templates/monthly";
  }

  @GetMapping(value = {
      "/accounts",
      "/accounts/{month}",
      "/accounts/{month}/{year}"
  })
  public String getAllBalancesForMonth(final ModelMap model,
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

  @GetMapping(value = {
      "/transactions/get/{accountName}",
      "/transactions/get/{accountName}/{date}"
  })
  public String getTransactions(final ModelMap model,
      @PathVariable("accountName") String accountName,
      @PathVariable(value = "date", required = false) String date) {
    Account account = accountService.getAccount(accountName);
    if (account == null) {
      model.addAttribute("errorMsg", "Failed to find account");
      return "home";
    }

    Set<Transaction> txns;
    LocalDate defaultDate = DateHelper.getNewTransactionDefaultDate(date);
    if (date == null) {
      txns = account.getTransactions();
    } else {
      txns = account.getTransactionsForDate(defaultDate);
    }
    model.addAttribute(account);
    model.addAttribute("accountName", account.getName());
    model.addAttribute("transactions", txns);
    model.addAttribute("date", date);
    model.addAttribute("month", defaultDate.getMonth().name());
    return "views/transactions/templates/transactions";
  }

  @GetMapping(value = {
      "/transactions/new/{accountName}",
      "/transactions/new/{accountName}/{date}"
  })
  public String getNewTransaction(final ModelMap model,
      @PathVariable("accountName") String accountName,
      @PathVariable(value = "date", required = false) String date) {
    model.addAttribute(new TransactionRequestBody());
    Account account = accountService.getAccount(accountName);
    model.addAttribute(account);

    LocalDate defaultDate = DateHelper.getNewTransactionDefaultDate(date);
    model.addAttribute("defaultDate", defaultDate);
    model.addAttribute("month", defaultDate.getMonth().name());
    return "views/transactions/templates/newtransaction";
  }

  @PostMapping(path = "/transactions/new")
  public String addTransaction(final ModelMap model, final TransactionRequestBody body) {
    if (!transactionService.addTransaction(body)) {
      model.addAttribute("errorMsg", "Failed to add transaction");
    }
    return getTransactions(model, body.getAccountName(), body.getDate());
  }

  @GetMapping(path = "/transactions/delete/{txnId}")
  public String deleteTransaction(final ModelMap model,
      @PathVariable("txnId") long id) {
    String account = transactionService.deleteTransaction(id);
    if (account == null) {
      model.addAttribute("errorMsg", "Failed to delete transaction");
      return "home";
    }
    return getTransactions(model, account, null);
  }
}
