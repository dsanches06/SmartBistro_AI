-- Migração 001 — adicionar campos de autenticação à tabela customers
USE smartbistro;

ALTER TABLE customers
  ADD COLUMN username      VARCHAR(100) NULL UNIQUE AFTER name,
  ADD COLUMN email         VARCHAR(150) NULL UNIQUE AFTER username,
  ADD COLUMN password_hash VARCHAR(255) NULL        AFTER phone;

-- Utilizadores de demo com auth (admin e manager)
-- Passwords: admin→admin123 | manager→manager123
INSERT INTO customers (name, username, email, phone, password_hash, role_id) VALUES
('Admin SmartBistro',   'admin',   'admin@smartbistro.pt',   NULL,       '$2b$10$e6BP1FypTH1HoEdcGkFvSONNRq7NVHbMvHGsS6pCPnTRKy1325Kyq', 1),
('Manager SmartBistro', 'manager', 'manager@smartbistro.pt', '555-0100', '$2b$10$8xnntok3EVYFLuse1MYds.klcWYqzZLXijT1S1r9/CdNvUkWZbgju', 1);
