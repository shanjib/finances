package com.shanjib.finances.rest;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.repo.TransactionRepo;
import com.shanjib.finances.data.service.AccountService;
import com.shanjib.finances.data.service.TransactionService;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import java.util.List;
import lombok.AllArgsConstructor;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@AllArgsConstructor
@RestController
public class DataController {

  private AccountService accountService;
  private TransactionService transactionService;

  @RequestMapping(path = "/account/add")
  private String addAccount(@RequestParam final String name) {
    if (accountService.addAccount(name)) {
      return "Success";
    } else {
      return "Failure";
    }
  }

  @RequestMapping(path = "/account/get")
  private Account getAccount(@RequestParam final String name) {
    return accountService.getAccount(name);
  }

  @RequestMapping(path = "/transaction/post")
  private String addTransaction(@RequestBody final TransactionRequestBody body) {
    if (transactionService.saveTransaction(body)) {
      return "Success";
    } else {
      return "Failure";
    }
  }

  @RequestMapping(path = "/transaction/get")
  private List<Transaction> getTransactions(@RequestParam final String name) {
    return transactionService.getTransactionsByAccount(name);
  }
}