package com.shanjib.finances.data.repo;

import com.shanjib.finances.data.model.Transaction;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.repository.CrudRepository;

public interface TransactionRepo extends CrudRepository<Transaction, String> {

  List<Transaction> findByAccountName(String name);
  List<Transaction> findByAccountNameAndDate(String name, LocalDate date);
}
