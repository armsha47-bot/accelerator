-- Dietary preference used by AI recipe suggestions. Run after schema.sql.
alter table profiles add column if not exists diet text default 'vegetarian';
