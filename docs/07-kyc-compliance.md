# 07 — Identity Verification (KYC), AML & Regulatory Considerations

## 7.1 Is KYC required for escrow services? (research summary)

**Yes — in any real deployment.** Escrow/custody of third-party funds is a regulated payment activity almost everywhere:

- **Ghana:** the Payment Systems and Settlement Act, 2019 (Act 987) requires a Bank of Ghana licence (PSP / Enhanced PSP / EMI) to hold customer funds; BoG AML/CFT guidelines mandate customer due diligence (CDD). Ghana's AML Act 2020 (Act 1044) applies. Mobile-money-linked accounts already piggyback on telco KYC, but a custodial wallet operator needs its own programme.
- **Crypto:** FATF guidance treats platforms that custody/exchange virtual assets as **VASPs** → full KYC/AML + the Travel Rule. Bank of Ghana has been piloting VASP registration guidelines; operating a real crypto escrow without registration would be non-compliant. **This is exactly why the academic build uses testnet TRX only** — state that explicitly in the report; it converts a limitation into a demonstrated compliance judgement.
- **Practice benchmark:** Escrow.com, Coinbase, Binance P2P all enforce tiered KYC with transaction limits — the model below mirrors that.

## 7.2 Risk-based verification tiers

| Tier | Requirements | Unlocks | Limits (config) |
|---|---|---|---|
| 0 | Email verified | Browse, chat, create draft escrows | No money movement |
| 1 | + Phone (SMS OTP) + full name | Fiat escrow, wallet, listings | ≤ GH₵1,000/tx · GH₵2,000/day withdrawals |
| 2 | + Government ID (Ghana Card/passport) + selfie liveness match | Crypto escrow, higher limits, seller payouts | ≤ GH₵10,000/tx · GH₵10,000/day |
| 3 | + Proof of address (≤3 months) + source-of-funds declaration for large sums | Business-scale use, driver role | Custom / manual |

Checks at Tier 2 (via Smile ID in production; manual admin queue in prototype — same `KycProvider` interface):
document authenticity (template/font/MRZ checks), face match doc↔selfie, liveness (blink/turn prompts), name/DOB consistency with profile, duplicate-identity detection (same doc across accounts → auto-flag), sanctions/PEP screening (OpenSanctions list in v1).

## 7.3 AML programme (documented for the report; automated rules in v1)

- **Transaction monitoring rules:** structuring (many just-under-limit transactions), rapid in-out flows (deposit → escrow → cancel → withdraw = classic layering), counterparty concentration (same pair looping funds), dormant-account sudden activity, mismatched geography (GH account, all-foreign IPs).
- Rules score into a **user risk score**; thresholds trigger: soft flag (monitor) → step-up KYC → freeze + manual review.
- Record-keeping: KYC docs + transaction records retained 5 years (BoG standard); audit-log immutability supports this.
- **Data protection:** Ghana Data Protection Act, 2012 (Act 843) — register as data controller (production), explicit consent for biometric processing (the selfie consent checkbox), KYC bucket encrypted at rest, access-logged, and never cached client-side; right-to-erasure honoured *except* records under AML retention duty (documented in privacy policy).

## 7.4 Fraud prevention beyond KYC

- Device fingerprinting on signup/login (FingerprintJS OSS) — multi-accounting detection.
- Disposable-email domain blocklist; VOIP-number detection on phone verify.
- New-account friction: first escrow capped at GH₵500 regardless of tier for accounts <7 days old.
- Reputation is **volume-weighted and KYC-gated** (reviews only from completed funded escrows — no wash-trading cheap escrows to farm stars: minimum fee makes farming costly, and repeat-counterparty reviews decay).
