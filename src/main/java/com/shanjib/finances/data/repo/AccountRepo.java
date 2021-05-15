package com.shanjib.finances.data.repo;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

// Ascending means 01-01 first
// Descending means 01-31 first
public interface AccountRepo extends CrudRepository<Account, String> {

  Account findByName(final String name);
  List<Transaction> findTransactionsByName(final String name);
}
