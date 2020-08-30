package com.shanjib.finances.data.service;

import static java.util.Objects.isNull;

import com.google.common.collect.Lists;
import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.repo.AccountRepo;
import com.shanjib.finances.rest.model.AccountRequestBody;
import com.shanjib.finances.utils.DateHelper;
import com.shanjib.finances.utils.StringHelper;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Month;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class AccountService {

  private final AccountRepo accountRepo;

  public List<Account> getAccount(final String name) {
    if (!StringHelper.validateArguments(name)) {
      log.error("Account {} not found", name);
      return Lists.newArrayList();
    }
    return accountRepo.findByName(name);
  }

  public Account getAccount(final String name, final LocalDate date) {
    return accountRepo.findByNameAndDate(name, date);
  }

  public Account getLatest(final String name) {
    return accountRepo.findFirstByNameOrderByDateDesc(name);
  }

  public List<Account> getAccountForMonth(final String name, final String month, final Integer year) {
    Month monthValue = DateHelper.getMonth(month);

    if (!StringHelper.validateArguments(name, month) || isNull(monthValue)) {
      log.error("Invalid arguments account name {} and month {}.", name, month);
      return Lists.newArrayList();
    }

    LocalDate firstOfMonth = LocalDate.of(year, monthValue, 1);
    LocalDate lastOfMonth = LocalDate.of(year, monthValue, monthValue.minLength());
    if (firstOfMonth.isLeapYear() && Month.FEBRUARY.equals(monthValue)) {
      lastOfMonth = lastOfMonth.plusDays(1);
    }

    Account firstBalance = accountRepo.findFirstByNameAndDateAfter(name, firstOfMonth.minusDays(1));
    if (isNull(firstBalance) || firstBalance.getDate().isAfter(firstOfMonth)) {
      backDateToDate(name, firstOfMonth);
    }

    Account lastBalance = accountRepo.findFirstByNameAndDateBeforeOrderByDateDesc(name, lastOfMonth.plusDays(1));
    if (isNull(lastBalance) || lastBalance.getDate().isBefore(lastOfMonth)) {
      continueToDate(name, lastOfMonth);
    }

    return accountRepo.findByNameAndDateBetweenOrderByDateAsc(name, firstOfMonth, lastOfMonth);
  }

  public boolean addAccount(final AccountRequestBody body) {
    if (!accountRepo.findByName(body.getName()).isEmpty()) {
      log.error("Cannot create account with name {}.", body.getName());
      return false;
    }

    Account newAccount = new Account();
    newAccount.setName(body.getName());
    newAccount.setBalance(body.getBalance());
    newAccount.setDate(body.getDate());
    accountRepo.save(newAccount);
    return true;
  }

  public void save(final Account account) {
    accountRepo.save(account);
  }

  public void continueToDate(final String name, final LocalDate endDate) {

    Account accountToContinue = accountRepo.findFirstByNameOrderByDateDesc(name);
    BigDecimal balance = accountToContinue.getBalance();
    LocalDate startDate = accountToContinue.getDate().plusDays(1);

    log.info("Continuing account {} to date {} carrying forward balance of {}.", name, endDate, balance);
    for (LocalDate date = startDate; date.isBefore(endDate.plusDays(1)); date = date.plusDays(1)) {
      Account accountToSave = Account.builder()
          .name(name)
          .balance(balance)
          .date(date)
          .build();
      accountRepo.save(accountToSave);
    }
  }

  public void backDateToDate(final String name, final LocalDate startDate) {

    Account accountToContinue = accountRepo.findFirstByNameOrderByDateAsc(name);
    BigDecimal balance = accountToContinue.getBalance();
    LocalDate endDate = accountToContinue.getDate();

    log.info("Back dating account {} to date {} assuming balance of {}.", name, startDate, balance);
    for (LocalDate date = startDate; date.isBefore(endDate.plusDays(1)); date = date.plusDays(1)) {
      Account accountToSave = Account.builder()
          .name(name)
          .balance(balance)
          .date(date)
          .build();
      accountRepo.save(accountToSave);
    }
  }
}
