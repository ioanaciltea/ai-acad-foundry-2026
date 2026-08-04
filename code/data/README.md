# Corpus Libra Assist - Libra Bank (domain: cards, credit cards, accounts)

This corpus is **fictitious**, created specifically for Assignment 3. It contains no real customer data and does not reproduce internal documents of any bank. The chosen domain is deliberately narrow: **bank cards, card-associated credit, and current accounts**, to maintain coherence between documents.

The corpus contains 15 documents (`.md`), each with a header (title, product, audience, effective, version), as requested in Part 3 of the assignment.

## Which document covers which test case

| Case from the assignment table | Covering document(s) | Detail |
|---|---|---|
| **A precise figure** | `credit-early-repayment.md` | early repayment fee is exactly 1% |
| **A precise figure** | `credit-card-interest.md` | 19.9% APR, 45-day grace period |
| **Two documents to combine** | `premium-card-eligibility.md` + `card-fees-2026.md` | eligibility is in the first document, effective costs (fees) are in the second |
| **Two documents to combine** | `credit-early-repayment.md` + `credit-card-interest.md` | to calculate the total cost you need the interest rate and the early repayment fee from two different files |
| **Near-duplicates that differ** | `card-fees-2025.md` vs `card-fees-2026.md` | same types of fees, different values across years |
| **A long procedure with steps** | `card-blocking-unblocking.md` (unblocking section, 6 steps) | tests if chunking breaks steps into separate pieces |
| **A long procedure with steps** | `card-replacement.md` (7 steps) and `lost-card-complaints.md` (5 steps) | similar long procedures |
| **A table** | `account-types-fee-table.md` | comparative table by account type, must not be fragmented across rows |
| **A table** | `card-fees-2025.md` and `card-fees-2026.md` | both contain a fee table by card type |
| **Contradiction between versions (date)** | `cash-withdrawal-limit-2025.md` vs `cash-withdrawal-limit-2026.md` | daily cash withdrawal limit changed from 2,000 RON to 3,000 RON, starting January 1, 2026 |
| **Something deliberately absent** | `unoffered-products.md` | explicitly mentions that the bank does NOT offer student loans, crypto, or unit-linked insurance; the assistant must refuse questions about them |

## All documents

1. `card-blocking-unblocking.md` - card blocking/unblocking procedure, with steps.
2. `card-replacement.md` - lost/stolen/expired card replacement procedure, with steps and fees.
3. `card-fees-2025.md` - card fee list, 2025 edition (old version, with table).
4. `card-fees-2026.md` - card fee list, 2026 edition (current version, with table).
5. `premium-card-eligibility.md` - eligibility conditions for the Premium Card.
6. `account-types-fee-table.md` - comparative monthly fee table by current account type.
7. `cash-withdrawal-limit-2025.md` - daily withdrawal limit, old version (June-December 2025).
8. `cash-withdrawal-limit-2026.md` - daily withdrawal limit, current version (from 2026).
9. `credit-early-repayment.md` - card credit early repayment fee and conditions.
10. `credit-card-interest.md` - APR, grace period, and minimum monthly payment for card credit.
11. `lost-card-complaints.md` - complaint procedure for unauthorized transactions.
12. `virtual-card.md` - virtual card: issuance, limits, usage restrictions.
13. `business-cards.md` - cards for corporate clients (Business, Business Gold).
14. `unoffered-products.md` - explicit list of products Libra Bank does NOT offer (student loans, crypto, unit-linked).
15. `current-account-onboarding.md` - current account opening procedure, online and at branches.
16. `savings-accounts-interest-2026.md` - interest rates and terms for savings accounts & term deposits (2026).
17. `international-sepa-transfers.md` - SEPA and non-SEPA/SWIFT international wire transfer rules & fees.
18. `mobile-banking-app-faq.md` - mobile app features, biometric authentication, and pin/device recovery.
19. `overdraft-facility-terms.md` - revolving overdraft limit, eligibility, and interest rates.
20. `chargeback-dispute-procedure.md` - merchant transaction dispute grounds, evidence, and 5-step process.
21. `cashback-loyalty-rewards-2026.md` - cashback loyalty reward tiers, merchant categories, and monthly caps.
22. `phishing-security-guidelines.md` - anti-phishing rules, security verification, and emergency contact numbers.
23. `sme-business-lending-terms.md` - SME working capital credit line eligibility, interest (ROBOR 3M+4.5%), and docs.

## Integration Notes

- Each file has a YAML header (`title`, `product`, `audience`, `effective`, `version`) that can be used as metadata during ingestion (Part 4) and for filtering during retrieval (Part 5).
- Documents `*-2025.md` vs `*-2026.md` are specifically designed as the "near-duplicates that differ" and "contradiction between versions" tests — filtering by `effective`/`version` should surface the correct version for a given question.
- `unoffered-products.md` exists specifically for group C questions (refusal) in Part 6.