package com.shanjib.finances.data.service;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.CreditDebitCode;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.repo.AccountRepo;
import com.shanjib.finances.rest.model.AccountRequestBody;
import com.shanjib.finances.utils.StringHelper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class AccountService {

  private final AccountRepo accountRepo;

  public Account getAccount(final String name) {
    if (StringHelper.validateArguments(name)) {
      log.error("Account {} not found", name);
      return null;
    }
    Account acc = accountRepo.findByName(name);
    acc.setCurrentBalance(getBalance(acc));
    return acc;
  }

  public List<Account> getAllAccounts() {
    List<Account> accs = accountRepo.findAll();
    accs.forEach(a -> a.setCurrentBalance(getBalance(a)));
    return accs;
  }

  public BigDecimal getBalance(final String name) {
    Account account = getAccount(name);
    if (account == null) {
      log.error("Cannot find account with name {}.", name);
      return null;
    }
    return getBalance(account, LocalDate.now());
  }

  public BigDecimal getBalance(final String name, final LocalDate asOfDate) {
    Account account = getAccount(name);
    if (account == null) {
      log.error("Cannot find account with name {}.", name);
      return null;
    }
    return getBalance(account, asOfDate);
  }

  public BigDecimal getBalance(final Account account) {
    return getBalance(account, LocalDate.now());
  }

  public BigDecimal getBalance(final Account account, final LocalDate asOfDate) {
    Set<Transaction> transactions = account.getTransactions();
    BigDecimal balance = account.getInitialBalance();
    for (Transaction txn : transactions) {
      if (txn.getDate().isAfter(asOfDate))
        continue;

      if (CreditDebitCode.CREDIT.equals(txn.getCreditDebitCode()))
        balance = balance.add(txn.getAmount());
      if (CreditDebitCode.DEBIT.equals(txn.getCreditDebitCode()))
        balance = balance.subtract(txn.getAmount());
    }
    return balance;
  }

  public boolean addAccount(final AccountRequestBody body) {
    if (getAccount(body.getName()) != null) {
      log.error("Cannot create account with name {}.", body.getName());
      return false;
    }

    Account newAccount = new Account();
    newAccount.setName(body.getName());
    newAccount.setInitialBalance(body.getBalance());
    accountRepo.save(newAccount);
    return true;
  }

  public void save(final Account account) {
    accountRepo.save(account);
  }
}
