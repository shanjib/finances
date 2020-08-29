package com.shanjib.finances.data.service;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class AccountingService {

  private final AccountService accountService;
  private final TransactionService transactionService;

  public void updateBalanceBasedOnTransaction(final Transaction transaction) {
    Account account = accountService.getAccount(transaction.getAccountName());

    BigDecimal newBalance = account.getBalance().subtract(transaction.getAmount());
    account.setBalance(newBalance);

    accountService.save(account);
  }

}
