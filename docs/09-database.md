# 09 — Database Design (PostgreSQL)

Conventions: UUID v7 PKs · `created_at`/`updated_at` on all tables · soft-delete (`deleted_at`) only where noted · money = BIGINT minor units + `currency` CHAR(3) (`GHS`,`TRX`) · enums as Postgres enums · FKs indexed.

## 9.1 Entity-relationship overview

```
users ─1:1─ user_profiles          users ─1:N─ sessions, devices
users ─1:N─ kyc_documents ─N:1─ kyc_reviews(admin)
users ─1:N─ wallets(per currency) ─1:N─ ledger_entries
users ─1:N─ listings ─1:N─ listing_images ; listings ─N:1─ categories
escrows ─N:1─ users(buyer) ─N:1─ users(seller) ─N:1─ listings?
escrows ─1:N─ escrow_milestones, escrow_events, chat_messages
escrows ─1:1?─ deliveries ─1:N─ delivery_events ; deliveries ─N:1─ drivers
escrows ─1:N─ payments ; escrows ─1:1?─ crypto_escrows
escrows ─1:1?─ disputes ─1:N─ dispute_evidence, dispute_messages
escrows ─1:N─ reviews(2 max: one per party)
users ─1:N─ withdrawals, notifications, audit_logs
```

## 9.2 Tables

**users** — id, email (citext, unique), password_hash, phone (unique, null), status enum(`active,suspended,deactivated,deleted`), role enum(`user,driver,support,kyc_reviewer,arbitrator,admin`), kyc_tier smallint default 0, risk_score int default 0, email_verified_at, phone_verified_at, totp_secret_enc, totp_enabled bool, failed_login_count, locked_until, last_login_at, deleted_at.

**user_profiles** — user_id PK/FK, handle (unique), display_name, avatar_url, bio, country default 'GH', rating_avg numeric(3,2), rating_count, completed_escrows int, member_since.

**sessions** — id, user_id, refresh_token_hash, family_id (rotation lineage), device_fingerprint, ip, user_agent, approx_location, expires_at, revoked_at, last_seen_at.

**otp_codes** — id, user_id?, channel enum(`email,sms`), purpose enum(`verify_email,verify_phone,login,reset,withdraw`), code_hash, attempts, expires_at, consumed_at.

**kyc_documents** — id, user_id, tier_target, doc_type enum(`ghana_card,passport,selfie,address_proof`), file_key (private bucket), status enum(`pending,approved,rejected`), rejection_reason, reviewed_by (admin id), reviewed_at, provider_ref (Smile ID id, null in prototype), expires_at.

**wallets** — id, user_id (null for platform accounts), currency, account_type enum(`available,escrow_locked,pending_withdrawal,platform_fees,platform_suspense,provider_clearing`), balance_cached bigint, version int. UNIQUE(user_id, currency, account_type).

**ledger_entries** — id, journal_id (groups the balanced set), wallet_id, direction enum(`debit,credit`), amount bigint CHECK(>0), currency, entry_type enum(`deposit,escrow_fund,escrow_release,escrow_refund,fee,withdrawal_hold,withdrawal_settle,withdrawal_return,adjustment`), escrow_id?, payment_id?, withdrawal_id?, description, balance_after bigint, created_at. **Append-only**; trigger blocks UPDATE/DELETE. Invariant job: per-journal Σdebit=Σcredit.

**categories** — id, name, slug, parent_id?, icon.

**listings** — id, seller_id, category_id, title, description, price bigint, currency, condition enum(`new,like_new,used,for_parts`), quantity, status enum(`draft,pending_review,active,paused,sold,removed`), delivery_options text[], location_region, fulltext tsvector (GIN index), deleted_at.

**listing_images** — id, listing_id, file_key, position, is_cover.

**escrows** — id, code (unique 8-char share code), type enum(`physical,digital,account,service,crypto`), origin enum(`marketplace,external`), listing_id?, creator_id, buyer_id?, seller_id?, title, description, amount bigint, currency, fee_amount bigint, fee_split enum(`buyer,seller,split`), status enum(as per state machine), accept_deadline, funding_deadline, delivery_deadline, inspection_ends_at, version int (optimistic lock), cancelled_reason?, closed_at.

**escrow_milestones** — id, escrow_id, position, title, amount, due_at, status enum(`pending,submitted,revision_requested,approved,released,disputed`), submission_note, submission_files jsonb, revision_count.

**escrow_events** — id, escrow_id, actor_id?, actor_role, event, payload jsonb, ip, created_at. Append-only.

**digital_deliverables** — id, escrow_id, file_key, file_name, size, sha256, uploaded_at, first_downloaded_at, download_log jsonb.

**credential_vault** — id, escrow_id, ciphertext bytea, key_ref, revealed_to?, revealed_at, access_log jsonb.

**drivers** — id, user_id FK, vehicle_type, plate_no, photo_key, status enum(`pending,approved,suspended`), rating_avg, jobs_completed.

**deliveries** — id, escrow_id, mode enum(`platform_driver,own_courier,pickup`), driver_id?, courier_name?, tracking_ref?, pickup_address jsonb, dropoff_address jsonb, geofence_lat/lng/radius, status enum(`created,assigned,accepted,picked_up,in_transit,arrived,verified,failed`), code_hash, code_expires_at, code_attempts, pickup_photo_key, proof_photo_key, signature_key, verified_gps jsonb, fee bigint.

**delivery_events** — id, delivery_id, actor enum(`system,driver,buyer,seller`), event, gps jsonb?, created_at.

**payments** — id, user_id, escrow_id?, provider enum(`paystack,tron,internal`), direction enum(`in,out`), amount, currency, provider_ref, idempotency_key (unique), status enum(`initiated,pending,succeeded,failed,chargeback_pending,charged_back,refunded`), raw_webhook jsonb, created_at.

**crypto_escrows** — id, escrow_id (unique), contract_address, deposit_address, expected_amount_sun bigint, received_amount_sun, buyer_refund_address, seller_payout_address, deposit_txid?, release_txid?, refund_txid?, confirmations int, status.

**withdrawals** — id, user_id, wallet_id, amount, fee, currency, destination jsonb (type, momo/bank details, name_resolved), status enum(`requested,approval_pending,processing,paid,failed,returned`), provider_ref, approved_by?, failure_reason.

**disputes** — id, escrow_id (unique), opened_by, reason enum, description, requested_outcome enum(`full_refund,partial_refund,release`), requested_amount?, status enum(`open,awaiting_response,under_review,ruled,appealed,final,executed`), arbitrator_id?, ruling enum(`release,full_refund,partial`)?, ruling_amount_buyer?, ruling_amount_seller?, ruling_reason, ruled_at, appeal_deadline, appealed_by?, executed_at.

**dispute_evidence** — id, dispute_id, submitted_by, file_key?, note, kind enum(`image,pdf,video,text,system_snapshot`), created_at. (System auto-attaches escrow_events + delivery proof + chat export as `system_snapshot`.)

**dispute_messages** — id, dispute_id, sender_id?, sender_role enum(`buyer,seller,arbitrator,system`), body, created_at.

**chat_messages** — id, escrow_id, sender_id, body?, file_key?, kind enum(`text,image,file,system`), flagged bool (scam-pattern), read_at, created_at. Immutable.

**reviews** — id, escrow_id, reviewer_id, reviewee_id, rating smallint CHECK 1..5, comment, created_at. UNIQUE(escrow_id, reviewer_id).

**notifications** — id, user_id, category enum(`escrow,money,security,dispute,marketing`), title, body, deep_link, read_at, channels_sent jsonb, created_at.

**notification_preferences** — user_id, category, push bool, email bool, sms bool. (Security email locked true.)

**outbox** — id, aggregate, aggregate_id, event_type, payload jsonb, processed_at?, attempts.

**audit_logs** — id, actor_id?, actor_role, action, entity_type, entity_id, before jsonb, after jsonb, reason?, ip, user_agent, request_id, created_at. Append-only.

**platform_settings** — key PK, value jsonb, updated_by, updated_at. (fee %, caps, limits, freeze switches, timeouts.)

## 9.3 Critical indexes & constraints

- `ledger_entries(wallet_id, created_at)`, `escrows(buyer_id,status)`, `escrows(seller_id,status)`, `escrows(code)`, `payments(idempotency_key) unique`, `listings fulltext GIN`, `notifications(user_id, read_at)`.
- CHECK: escrow amount > 0; milestone sums validated in service layer + deferred trigger.
- Partial unique: one open dispute per escrow `WHERE status <> 'final'`.
