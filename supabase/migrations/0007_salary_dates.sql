-- Manual-only for now (no auto-calc rule exists yet, unlike contract_review_date).
-- Editable via the employee edit form added in this plan.
alter table employees
  add column salary_review_date date,
  add column salary_announce_date date;
