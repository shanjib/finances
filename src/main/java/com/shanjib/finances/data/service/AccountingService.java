package com.shanjib.finances.data.service;

import static java.util.Objects.isNull;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import java.math.BigDecimal;
import java.time.LocalDate;
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
    Account account = accountService.getAccount(transaction.getAccountName(), transaction.getDate());
    if (isNull(account)) {
      accountService.continueToDate(transaction.getAccountName(), transaction.getDate());
      account = accountService.getAccount(transaction.getAccountName(), transaction.getDate());
    }

    account.addTransaction(transaction);
    accountService.save(account);

    adjustBalance(account, transaction);
    updateFutureBalances(transaction);
  }

  public void updateFutureBalances(final Transaction transaction) {
    Account latestAccount = accountService.getLatest(transaction.getAccountName());

    LocalDate startDate = transaction.getDate().plusDays(1);
    LocalDate endDate = latestAccount.getDate().plusDays(1);

    for (LocalDate date = startDate; date.isBefore(endDate); date = date.plusDays(1)) {
      Account account = accountService.getAccount(transaction.getAccountName(), date);
      adjustBalance(account, transaction);
    }
  }

  private void adjustBalance(final Account account, final Transaction transaction) {

    BigDecimal newBalance = account.getBalance().subtract(transaction.getAmount());
    account.setBalance(newBalance);
    accountService.save(account);
  }

}
