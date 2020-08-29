package com.shanjib.finances.data.repo;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface AccountRepo extends CrudRepository<Account, String> {

  Account findByName(final String name);
  List<Transaction> findTransactionsByName(final String name);
}
