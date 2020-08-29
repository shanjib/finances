package com.shanjib.finances.data.service;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.repo.AccountRepo;
import java.math.BigDecimal;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.h2.util.StringUtils;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class AccountService {

  private final AccountRepo accountRepo;

  public Account getAccount(final String name) {
    if (StringUtils.isNullOrEmpty(name)) {
      log.error("Account {} not found", name);
      return new Account();
    }
    return accountRepo.findByName(name);
  }

  public boolean addAccount(final String name) {
    if (StringUtils.isNullOrEmpty(name) || accountRepo.findByName(name) != null) {
      log.error("Cannot create account with name {}.", name);
      return false;
    }

    Account newAccount = new Account();
    newAccount.setName(name);
    newAccount.setBalance(BigDecimal.ZERO);
    accountRepo.save(newAccount);
    return true;
  }

  public void save(final Account account) {
    accountRepo.save(account);
  }
}
