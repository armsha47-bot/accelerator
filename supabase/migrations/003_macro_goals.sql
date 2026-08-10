-- Per-user macro goals. Run after schema.sql on an existing project.
alter table profiles add column if not exists protein_goal integer default 150;
alter table profiles add column if not exists carbs_goal integer default 300;
alter table profiles add column if not exists fat_goal integer default 80;
