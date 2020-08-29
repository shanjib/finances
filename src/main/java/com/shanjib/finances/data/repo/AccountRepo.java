package com.shanjib.finances.data.repo;

import com.shanjib.finances.data.model.Account;
import org.springframework.data.repository.CrudRepository;

public interface AccountRepo extends CrudRepository<Account, String> {

  Account findByName(final String name);
}
