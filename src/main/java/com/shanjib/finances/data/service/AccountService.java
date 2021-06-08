package com.shanjib.finances.data.service;

import static com.shanjib.finances.utils.MathHelper.addTransaction;

import com.google.common.collect.Lists;
import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Balance;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.repo.AccountRepo;
import com.shanjib.finances.rest.model.AccountRequestBody;
import com.shanjib.finances.utils.DateHelper;
import com.shanjib.finances.utils.StringHelper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

  public LinkedHashMap<Account, List<Balance>> getBalancesForAllAccountsAcrossDates(final String monthStr, final int year) {
    List<Account> accs = accountRepo.findAll();
    Collections.sort(accs);
    LinkedHashMap<Account, List<Balance>> accountToBalances = new LinkedHashMap<>();

    for (Account acc : accs) {
      accountToBalances.put(acc, getBalancesAcrossDates(acc.getName(), monthStr, year));
    }
    return accountToBalances;
  }

  public List<Balance> getBalancesAcrossDates(final String name, final String monthStr, final int year) {
    Month month = DateHelper.getMonth(monthStr);
    LocalDate startDate = LocalDate.of(year, month, 1);
    LocalDate endDate = LocalDate.of(year, month, month.minLength());
    return getBalancesAcrossDates(name, startDate, endDate);
  }

  public List<Balance> getBalancesAcrossDates(final String name, final LocalDate startDate, final LocalDate endDate) {
    if (startDate.isAfter(endDate)) {
      log.error("");
      return null;
    }

    Account account = getAccount(name);
    if (account == null) {
      log.error("Cannot find account with name {}.", name);
      return null;
    }

    BigDecimal balance = account.getInitialBalance();
    Map<LocalDate, List<Transaction>> dateToTxnMap = new HashMap<>();
    for (Transaction txn : account.getOrderedTransactions()) {
      // skip all txns after end date
      if (txn.getDate().isAfter(endDate))
        break;

      // add til initial balance on start date
      if (txn.getDate().isBefore(startDate)) {
        balance = addTransaction(balance, txn);
        continue;
      }

      List<Transaction> dateTxns = dateToTxnMap.getOrDefault(txn.getDate(), Lists.newArrayList());
      dateTxns.add(txn);
      dateToTxnMap.put(txn.getDate(), dateTxns);
    }

    List<Balance> balances = Lists.newArrayList();
    LocalDate currentDate = startDate;
    while (endDate.isAfter(currentDate) || endDate.isEqual(currentDate)) {
      List<Transaction> dateTxns = dateToTxnMap.get(currentDate);
      if (dateTxns == null) {
        balances.add(Balance.builder()
            .accountName(name)
            .date(currentDate)
            .balance(balance)
            .build());
      } else {
        balance = addTransaction(balance, dateTxns);
        balances.add(Balance.builder()
            .accountName(name)
            .date(currentDate)
            .balance(balance)
            .transactions(dateTxns)
            .build());
      }
      currentDate = currentDate.plusDays(1);
    }
    return balances;
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
    List<Transaction> transactions = account.getOrderedTransactions();
    BigDecimal balance = account.getInitialBalance();
    for (Transaction txn : transactions) {
      if (txn.getDate().isAfter(asOfDate))
        continue;

      balance = addTransaction(balance, txn);
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
