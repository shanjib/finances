package com.shanjib.finances.data.repo;

import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

// Ascending means 01-01 first
// Descending means 01-31 first
public interface AccountRepo extends CrudRepository<Account, String> {

  Account findByNameAndDate(final String name, final LocalDate date);
  Account findFirstByNameOrderByDateAsc(final String name);
  Account findFirstByNameOrderByDateDesc(final String name);
  Account findFirstByNameAndDateBeforeOrderByDateDesc(final String name, final LocalDate date);
  Account findFirstByNameAndDateAfter(final String name, final LocalDate date);
  List<Account> findByName(final String name);
  List<Account> findByNameAndDateBetweenOrderByDateDesc(final String name, final LocalDate startDate, final LocalDate endDate);
  List<Account> findByNameAndDateBetweenOrderByDateAsc(final String name, final LocalDate startDate, final LocalDate endDate);
  List<Transaction> findTransactionsByName(final String name);
}
