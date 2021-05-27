package com.shanjib.finances.data.service;

import com.google.common.collect.Lists;
import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.CreditDebitCode;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.repo.TransactionRepo;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.h2.util.StringUtils;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class TransactionService {

  private final TransactionRepo transactionRepo;
  private final AccountService accountService;

  public List<Transaction> getTransactionsByAccount(String accountName) {
    if (StringUtils.isNullOrEmpty(accountName)) {
      log.error("Account {} not found", accountName);
      return Lists.newArrayList();
    }

    return transactionRepo.findByAccountName(accountName);
  }

  public boolean addTransaction(TransactionRequestBody body) {
    if (body.isNullOrEmpty()) {
      log.error("Transaction request body is null or empty, {}", body);
      return false;
    }

    Account account = accountService.getAccount(body.getAccountName());
    if (account == null) {
      log.error("Failed to find account for {}", body.getAccountName());
      return false;
    }

    Transaction transaction = Transaction.builder()
        .accountId(account.getId())
        .accountName(body.getAccountName())
        .date(LocalDate.parse(body.getDate()))
        .description(body.getDescription())
        .amount(new BigDecimal(body.getAmount()))
        .creditDebitCode(CreditDebitCode.getEnum(body.getCreditDebit()))
        .build();
    transactionRepo.save(transaction);
    return true;
  }
}
