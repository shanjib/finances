package com.shanjib.finances.data.repo;

import com.shanjib.finances.data.model.Account;
import java.util.List;

// Ascending means 01-01 first
// Descending means 01-31 first
public interface AccountRepo extends CustomRepository<Account, String> {

  Account findByName(final String name);
  List<Account> findAll();
}
