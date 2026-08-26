-- All three columns are nullable by design: pre-existing documents keep
-- transaction_type/amount/franchise_store_id as NULL ("미분류") forever unless
-- someone edits them later (out of scope for this plan) — every aggregation
-- query in this plan explicitly filters transaction_type is not null, so
-- unclassified rows are silently excluded rather than coerced into a default.
alter table documents
  add column transaction_type text check (transaction_type in ('매출', '매입')),
  add column amount numeric(14, 2),
  add column franchise_store_id uuid references franchise_stores(id);
