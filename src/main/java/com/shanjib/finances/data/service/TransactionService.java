package com.shanjib.finances.data.service;

import com.google.common.collect.Lists;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.repo.TransactionRepo;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.h2.util.StringUtils;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class TransactionService {

  private final DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ISO_LOCAL_DATE;
  private final TransactionRepo transactionRepo;

  public List<Transaction> getTransactionsByAccount(String accountName) {
    if (StringUtils.isNullOrEmpty(accountName)) {
      log.error("Account {} not found", accountName);
      return Lists.newArrayList();
    }

    return transactionRepo.findByAccountName(accountName);
  }

  public boolean saveTransaction(TransactionRequestBody requestBody) {
    Transaction transaction = Transaction.builder()
        .accountName(requestBody.getAccountName())
        .date(LocalDate.parse(requestBody.getDate()))
        .description(requestBody.getDescription())
        .amount(new BigDecimal(requestBody.getAmount()))
        .build();
    transactionRepo.save(transaction);
    return true;
  }
}
