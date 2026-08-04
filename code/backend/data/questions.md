# Evaluation Questions Set - Libra Assist

This file contains the 15 evaluation questions designed for Assignment 3, split into three groups: simple retrieval (A), multi-step reasoning/combination (B), and out-of-scope/refusal questions (C).

---

## Group A · Simple Retrieval (Single document / chunk)

### Q1
- **Question:** What is the standard daily ATM cash withdrawal limit for a Standard Card starting in 2026?
- **Expected Answer:** 3,000 RON per day.
- **Source Document:** `cash-withdrawal-limit-2026.md`

### Q2
- **Question:** What is the early repayment fee for a credit card?
- **Expected Answer:** 1% of the early repaid amount, applied once.
- **Source Document:** `credit-early-repayment.md`

### Q3
- **Question:** What is the Annual Percentage Rate (APR) for Libra Bank credit cards?
- **Expected Answer:** 19.9% per year.
- **Source Document:** `credit-card-interest.md`

### Q4
- **Question:** How many consecutive incorrect PIN entries will automatically block a card?
- **Expected Answer:** 3 (three) consecutive times.
- **Source Document:** `card-blocking-unblocking.md`

### Q5
- **Question:** What is the monthly maintenance fee for an Active Account?
- **Expected Answer:** 9.9 RON (excluding VAT).
- **Source Document:** `account-types-fee-table.md`

### Q6
- **Question:** What is the issuance fee for a virtual card?
- **Expected Answer:** Issuing a virtual card is free.
- **Source Document:** `virtual-card.md`

### Q7
- **Question:** Within how many business days must a customer file a written complaint for an unauthorized card transaction?
- **Expected Answer:** Within a maximum of 13 business days.
- **Source Document:** `lost-card-complaints.md`

---

## Group B · Multi-Step & Combination (Multiple documents / calculation / conditions)

### Q8
- **Question:** What are all the eligibility conditions I need to meet to get a Premium Card?
- **Expected Answer:** 1) Net monthly income of at least 8,000 RON collected in a Libra Bank account for the last 3 consecutive months; 2) Minimum 12 months tenure as a Libra Bank customer with at least one active product; 3) No overdue payments on any credit facility in the last 6 months; 4) Minimum age of 21 years.
- **Source Document:** `premium-card-eligibility.md`

### Q9
- **Question:** If I make an early repayment of 5,000 RON on my credit card, what is the exact fee charged, and what is the minimum amount allowed for a partial early repayment?
- **Expected Answer:** The fee is 50 RON (1% of 5,000 RON), and the minimum amount for a partial early repayment is 100 RON.
- **Source Document:** `credit-early-repayment.md`

### Q10
- **Question:** What documents or steps do I need to check to know both the eligibility criteria for a Premium Card and its annual maintenance fee?
- **Expected Answer:** Eligibility conditions are found in `premium-card-eligibility.md` (minimum income of 8,000 RON, 12 months tenure, no overdues, age 21+), and the effective annual maintenance fee (300 RON) is found in `card-fees-2026.md`.
- **Source Document:** `premium-card-eligibility.md` + `card-fees-2026.md`

### Q11
- **Question:** If I fail to pay my credit card balance in full before the grace period ends, how is the interest calculated and applied based on the terms?
- **Expected Answer:** The 19.9% annual interest applies retroactively to the entire utilized amount, starting from the date of each transaction.
- **Source Document:** `credit-card-interest.md` + `credit-early-repayment.md`

### Q12
- **Question:** What is the difference in the standard daily cash withdrawal limit for a Standard Card between the old 2025 policy and the current 2026 policy?
- **Expected Answer:** In 2025 (June–December), the standard daily limit was 2,000 RON per day (`cash-withdrawal-limit-2025.md`), whereas starting January 1, 2026, it was increased to 3,000 RON per day (`cash-withdrawal-limit-2026.md`).
- **Source Document:** `cash-withdrawal-limit-2025.md` + `cash-withdrawal-limit-2026.md`

---

## Group C · Must Refuse (Out of scope / Absent in corpus)

### Q13
- **Question:** What is the interest rate on your student loans?
- **Expected Answer:** Refusal. Libra Bank does not offer student loans.
- **Source Document:** `unoffered-products.md`

### Q14
- **Question:** Can I open a cryptocurrency wallet or trade crypto through my mobile app?
- **Expected Answer:** Refusal. The bank does not offer cryptocurrency wallets, transactions, or custody.
- **Source Document:** `unoffered-products.md`

### Q15
- **Question:** Do you offer unit-linked life insurance policies with investment components?
- **Expected Answer:** Refusal. Unit-linked life insurance is not in the current portfolio (though classical life insurance is available via external partners).
- **Source Document:** `unoffered-products.md`