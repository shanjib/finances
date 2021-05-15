package com.shanjib.finances.data.service;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.repo.AccountRepo;
import com.shanjib.finances.rest.model.AccountRequestBody;
import com.shanjib.finances.utils.StringHelper;
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
    return accountRepo.findByName(name);
  }

  public boolean addAccount(final AccountRequestBody body) {
    if (getAccount(body.getName()) != null) {
      log.error("Cannot create account with name {}.", body.getName());
      return false;
    }

    Account newAccount = new Account();
    newAccount.setName(body.getName());
    newAccount.setBeginningBalance(body.getBalance());
    accountRepo.save(newAccount);
    return true;
  }

  public void save(final Account account) {
    accountRepo.save(account);
  }
}
