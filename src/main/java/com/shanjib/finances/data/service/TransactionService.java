package com.shanjib.finances.data.service;

import com.google.common.collect.Lists;
import com.shanjib.finances.data.model.Account;
import com.shanjib.finances.data.model.Transaction;
import com.shanjib.finances.data.model.TransactionType;
import com.shanjib.finances.data.repo.AccountRepo;
import com.shanjib.finances.data.repo.TransactionRepo;
import com.shanjib.finances.rest.model.TransactionRequestBody;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import javax.transaction.Transactional;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.h2.util.StringUtils;
import org.springframework.stereotype.Service;

@AllArgsConstructor
@Service
@Slf4j
public class TransactionService {

  private final TransactionRepo transactionRepo;
  private final AccountRepo accountRepo;
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

    TransactionType txnType = TransactionType.getEnum(body.getTransactionType());
    if (TransactionType.TRANSFER.equals(txnType) && StringUtils.isNullOrEmpty(body.getTransferAccount())) {
      log.error("Transaction request body is null or empty, {}", body);
      return false;
    } else if (TransactionType.TRANSFER.equals(txnType)) {
      addTransferTransaction(body);
    }

    Account account = accountService.getAccount(body.getAccountName());
    if (account == null) {
      log.error("Failed to find account for {}", body.getAccountName());
      return false;
    }

    Transaction transaction = Transaction.builder()
        .accountId(account.getId())
        .accountName(account.getName())
        .date(LocalDate.parse(body.getDate()))
        .description(body.getDescription())
        .amount(new BigDecimal(body.getAmount()))
        .transactionType(TransactionType.getEnum(body.getTransactionType()))
        .build();

    accountRepo.save(account);
    accountRepo.refresh(account);

    transactionRepo.save(transaction);
    transactionRepo.refresh(transaction);
    return true;
  }

  @Transactional
  public String deleteTransaction(long id) {
    Transaction txn = transactionRepo.getById(id);
    transactionRepo.deleteById(id);
    return txn == null ? null : txn.getAccountName();
  }

  private boolean addTransferTransaction(TransactionRequestBody body) {
    Account account = accountService.getAccount(body.getTransferAccount());
    if (account == null) {
      log.error("Failed to find account for {}", body.getAccountName());
      return false;
    }

    BigDecimal amount = new BigDecimal(body.getAmount());
    amount = amount.negate();

    Transaction transaction = Transaction.builder()
        .accountId(account.getId())
        .accountName(account.getName())
        .date(LocalDate.parse(body.getDate()))
        .description(body.getDescription())
        .amount(amount)
        .transactionType(TransactionType.TRANSFER)
        .build();

    account.getTransactions().add(transaction);
    accountRepo.save(account);
    accountRepo.refresh(account);

    transactionRepo.save(transaction);
    transactionRepo.refresh(transaction);
    return true;
  }
}
