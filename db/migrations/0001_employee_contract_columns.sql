-- 인사대장에 있었지만 담을 곳이 없어 옮기지 못한 네 열을 받는다.
--
-- 시트의 '정규직평가일'은 새 컬럼을 만들지 않는다. 입사일 +3개월이라는 성격이
-- 이미 있는 contract_review_date(수습평가일)와 같아서, 컬럼을 하나 더 두면
-- 같은 뜻의 날짜가 두 개가 된다. 값이 적힌 5건은 contract_review_date를
-- 덮어쓰는 것으로 옮겼다.
alter table employees
  add column job_title text,
  add column contract_end_date date,
  add column regular_conversion_date date,
  -- 연봉협상평가일은 대장에 '10월'처럼 월만 적혀 있다. 매년 돌아오는 달이지
  -- 특정 날짜가 아니므로 date가 아니라 월 번호로 담는다.
  add column salary_negotiation_month int
    check (salary_negotiation_month between 1 and 12);
