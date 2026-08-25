-- PLACEHOLDER: replace with real department list once confirmed
insert into departments (name) values
  ('기획운영팀'), ('회계팀'), ('개발팀'), ('영업팀'), ('디자인팀'), ('경영지원팀')
on conflict (name) do nothing;
