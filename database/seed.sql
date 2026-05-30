-- =========================================================================
-- SEED DATA — SmartBistro AI
-- Executar DEPOIS de schema.sql (DDL puro)
-- =========================================================================

USE smartbistro;

-- =========================================================================
-- 1. ROLES
-- =========================================================================
INSERT INTO roles (id, name, flow_order) VALUES
(1, 'ADMIN', 1),
(2, 'USER',  2),
(3, 'MODEL', 3);

-- =========================================================================
-- 2. CLIENTES
-- =========================================================================
INSERT INTO customers (id, name, email, phone, gender) VALUES
( 1, 'Hugo Neto',      'hugo@dev.com',            '555-0108', 'Male'),
( 2, 'Ana Silva',      'ana@dev.com',              '555-0101', 'Female'),
( 3, 'Joana Luz',      'joana@dev.com',            '555-0110', 'Female'),
( 4, 'Bruno Costa',    'bruno@dev.com',            '555-0102', 'Male'),
( 5, 'Igor Lima',      'igor@dev.com',             '555-0109', 'Male'),
( 6, 'Carla Dias',     'carla@dev.com',            '555-0103', 'Female'),
( 7, 'Filipe Gil',     'filipe@dev.com',           '555-0106', 'Male'),
( 8, 'Elena Vaz',      'elena@dev.com',            '555-0105', 'Female'),
( 9, 'David Reas',     'david@dev.com',            '555-0104', 'Male'),
(10, 'Gina Rosa',      'gina@dev.com',             '555-0107', 'Female'),
(11, 'Ana Pereira',    'ana.pereira@dev.com',      '555-0111', 'Female'),
(12, 'Carlos Silva',   'carlos@dev.com',           '555-0112', 'Male'),
(13, 'Manuel Santos',  'manuel@dev.com',           '555-0113', 'Male'),
(14, 'Mariana Costa',  'mariana@dev.com',          '555-0114', 'Female'),
(15, 'Pedro Almeida',  'pedro@dev.com',            '555-0115', 'Male'),
(16, 'Joana Martins',  'joana.martins@dev.com',    '555-0116', 'Female');

-- =========================================================================
-- 3. MESAS
-- =========================================================================
INSERT INTO tables (table_number, capacity, status) VALUES
('T01',  2, 'Available'),
('T02',  4, 'Available'),
('T03',  4, 'Available'),
('T04',  4, 'Available'),
('T05',  6, 'Available'),
('T06',  6, 'Occupied'),
('T07',  8, 'Available'),
('T08',  8, 'Available'),
('T09',  2, 'Available'),
('T10', 10, 'Available'),
('T11',  2, 'Reserved'),
('T12',  4, 'Available'),
('T13',  4, 'Occupied'),
('T14',  6, 'Reserved'),
('T15',  8, 'Available'),
('T16',  2, 'Reserved'),
('T17',  4, 'Available'),
('T18',  4, 'Available'),
('T19',  6, 'Reserved'),
('T20', 10, 'Available'),
('T21',  4, 'Available'),
('T22',  4, 'Available'),
('T23',  6, 'Available'),
('T24',  8, 'Available');

-- =========================================================================
-- 4. INGREDIENTES + STOCK
-- =========================================================================
INSERT INTO ingredients (name, measurement_unit) VALUES
('Long Italian Pasta',  'kg'),
('Minced Beef Meat',    'kg'),
('Brioche Burger Bun',  'units'),
('Chicken Breast',      'kg'),
('Salmon Fillet',       'kg'),
('Mixed Lettuce',       'kg'),
('Cherry Tomatoes',     'kg'),
('Garlic',              'kg'),
('Lemon',               'units'),
('Mozzarella Cheese',   'kg'),
('Parmesan Cheese',     'kg'),
('Butter',              'kg'),
('Heavy Cream',         'L'),
('Eggs',                'units'),
('Wheat Flour',         'kg'),
('Sugar',               'kg'),
('Sourdough Bread',     'units'),
('French Fries',        'kg'),
('Olive Oil',           'L'),
('Dark Chocolate',      'kg'),
('Sparkling Water',     'L'),
('Orange Juice',        'L'),
('Craft Beer',          'L'),
('Red Wine',            'L'),
('Beef Steak',          'kg'),
('Rice',                'kg'),
('Seafood Mix',         'kg'),
('Pizza Dough',         'units'),
('Tomato Sauce',        'kg'),
('Cucumber',            'kg'),
('Cod Fish',            'kg'),
('Potatoes',            'kg'),
('Coffee Beans',        'kg'),
('Mixed Vegetables',    'kg'),
('Coca-Cola',           'L'),
('Sumol',               'L');

INSERT INTO stock (ingredient_id, available_quantity, unit_cost) VALUES
( 1, 20.00,  1.5000), ( 2, 15.00,  7.5000), ( 3, 50.00,  0.4000),
( 4, 10.00,  5.5000), ( 5,  8.00, 12.0000),
( 6,  5.00,  2.5000), ( 7,  4.00,  3.0000), ( 8,  5.00,  4.0000), ( 9, 30.00,  0.1500),
(10,  6.00,  8.0000), (11,  4.00, 15.0000), (12,  5.00,  6.0000), (13,  4.00,  2.8000), (14, 100.00, 0.2500),
(15, 15.00,  0.8000), (16,  8.00,  1.2000), (17, 40.00,  0.6000), (18, 10.00,  1.5000),
(19, 10.00,  3.5000), (20,  3.00,  9.0000),
(21, 50.00,  0.5000), (22, 20.00,  1.2000), (23, 15.00,  2.0000), (24, 12.00,  4.5000),
(25, 12.00, 14.0000), (26, 20.00,  0.8000), (27,  8.00, 10.0000), (28, 30.00,  0.5000),
(29, 10.00,  1.5000), (30, 10.00,  1.0000), (31, 10.00, 12.0000), (32, 15.00,  0.6000),
(33,  5.00, 15.0000), (34, 10.00,  2.0000), (35, 40.00,  0.8000), (36, 30.00,  0.7000);

-- =========================================================================
-- 5. ITENS DO MENU + FICHAS TÉCNICAS
-- =========================================================================
INSERT INTO items (name, category, price) VALUES
('Esparguete Bolonhesa', 'Main Course', 12.50),
('Hamburguer Gourmet',   'Main Course', 14.00),
('Bruschetta',           'Appetizer',    7.50),
('Caesar Salad',         'Appetizer',    9.00),
('Chicken Wings',        'Appetizer',   11.00),
('Creme Soup',           'Appetizer',    6.50),
('Grilled Salmon',       'Main Course', 18.50),
('Chicken Parmigiana',   'Main Course', 15.00),
('Vegetarian Pasta',     'Main Course', 13.00),
('Chocolate Mousse',     'Dessert',      6.00),
('Tiramisu',             'Dessert',      7.00),
('Cheesecake',           'Dessert',      6.50),
('Orange Juice',         'Beverage',     3.50),
('Craft Beer',           'Beverage',     4.50),
('Red Wine Glass',       'Beverage',     5.50),
('Sparkling Water',      'Beverage',     2.00),
('Bife à Casa',          'Main Course', 16.00),
('Arroz de Marisco',     'Main Course', 19.50),
('Batatas Fritas',       'Appetizer',    4.00),
('Pizza Margherita',     'Main Course', 14.50),
('Bacalhau à Brás',      'Main Course', 17.00),
('Salada Mista',         'Appetizer',    6.00),
('Frango Assado',        'Main Course', 14.50),
('Legumes Salteados',    'Appetizer',    7.50),
('Coca-Cola',            'Beverage',     2.50),
('Sumol',                'Beverage',     2.00),
('Café',                 'Beverage',     1.50),
('Pão',                  'Appetizer',    2.50);

INSERT INTO recipe_items (item_id, ingredient_id, required_quantity) VALUES
(1,  1, 0.12), (1,  2, 0.15),
(2,  3, 1.00), (2,  2, 0.18),
(3, 17, 0.15), (3,  7, 0.05), (3,  8, 0.01), (3, 19, 0.02), (3, 10, 0.06),
(4,  6, 0.15), (4, 11, 0.04), (4, 19, 0.02), (4,  9, 0.50), (4, 14, 1.00),
(5,  4, 0.35), (5,  8, 0.01),
(6, 13, 0.15), (6, 12, 0.02), (6, 15, 0.03), (6,  8, 0.01),
(7,  5, 0.25), (7,  9, 1.00), (7, 19, 0.02), (7, 18, 0.15),
(8,  4, 0.25), (8, 10, 0.08), (8, 15, 0.05), (8, 14, 1.00), (8, 19, 0.02),
(9,  1, 0.15), (9,  7, 0.08), (9,  8, 0.01), (9, 19, 0.03), (9, 11, 0.03),
(10, 20, 0.08), (10, 14, 2.00), (10, 16, 0.04), (10, 13, 0.10), (10, 12, 0.02),
(11, 14, 2.00), (11, 16, 0.05), (11, 13, 0.12), (11, 20, 0.03), (11, 15, 0.05),
(12, 14, 2.00), (12, 16, 0.06), (12, 12, 0.05), (12, 13, 0.15), (12, 15, 0.06),
(13, 22, 0.30), (14, 23, 0.50), (15, 24, 0.15), (16, 21, 0.50),
(17, 25, 0.25), (17, 18, 0.15),
(18, 27, 0.20), (18, 26, 0.15), (18, 19, 0.02),
(19, 18, 0.20), (19, 19, 0.02),
(20, 28, 1.00), (20, 29, 0.10), (20, 10, 0.12),
(21, 31, 0.20), (21, 32, 0.15), (21, 14, 2.00), (21, 19, 0.02),
(22,  6, 0.12), (22,  7, 0.06), (22, 30, 0.05),
(23,  4, 0.30), (23,  8, 0.01), (23, 19, 0.02),
(24, 34, 0.20), (24, 19, 0.02),
(25, 35, 0.33), (26, 36, 0.33), (27, 33, 0.01), (28, 17, 1.00);

-- =========================================================================
-- 6. RESERVAS
-- =========================================================================
INSERT INTO reservations (customer_id, table_id, reservation_date, party_size, status, phone, notes) VALUES
(11, 11, '2026-05-30 19:00:00', 2, 'Confirmed', '555-0111', NULL),
(12,  5, '2026-05-30 20:00:00', 4, 'Confirmed', '555-0112', NULL),
(14, 14, '2026-05-30 20:30:00', 5, 'Confirmed', '555-0114', 'Sem glúten'),
(15,  2, '2026-05-31 12:30:00', 2, 'Pending',   '555-0115', NULL),
(16,  9, '2026-05-31 13:00:00', 1, 'Pending',   '555-0116', 'Mesa na esplanada'),
( 1, 10, '2026-05-31 19:00:00', 8, 'Confirmed', '555-0108', 'Reunião de empresa'),
( 2, 12, '2026-05-31 19:30:00', 3, 'Confirmed', '555-0101', NULL),
( 3, 16, '2026-06-01 12:00:00', 2, 'Pending',   '555-0110', NULL),
( 4,  7, '2026-06-01 20:00:00', 3, 'Pending',   '555-0102', NULL),
( 5, 20, '2026-06-02 13:00:00', 9, 'Confirmed', '555-0109', 'Aniversário'),
( 6, 19, '2026-06-02 19:00:00', 5, 'Confirmed', '555-0103', NULL),
( 7,  3, '2026-05-28 19:00:00', 4, 'Completed', '555-0106', NULL),
( 8, 15, '2026-05-29 20:00:00', 6, 'Completed', '555-0105', NULL),
( 9,  4, '2026-05-29 19:00:00', 2, 'Completed', '555-0104', NULL),
(10,  6, '2026-05-27 20:00:00', 5, 'Cancelled', '555-0107', 'Cancelado pelo cliente');

-- =========================================================================
-- 7. PEDIDOS (KDS) — AUTO_INCREMENT = 1023
-- =========================================================================
ALTER TABLE orders AUTO_INCREMENT = 1023;

INSERT INTO orders (customer_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status, created_at) VALUES
(16,  9, 'Table',    NULL, '["Grilled Salmon","Legumes Salteados","Sparkling Water"]',                        'Delivered',      '2026-05-30 12:33:00'),
(15,  2, 'Table',    NULL, '["Frango Assado","Craft Beer"]',                                                 'Delivered',      '2026-05-30 12:36:00'),
(14, 12, 'Table',    NULL, '["Bruschetta","Sumol","Esparguete Bolonhesa","Caesar Salad","Chocolate Mousse"]', 'Ready',          '2026-05-30 10:37:00'),
(13, NULL,'Takeaway',NULL, '["Hamburguer Gourmet","Batatas Fritas","Sparkling Water"]',                       'In Preparation', '2026-05-30 12:40:00'),
(12,  3, 'Table',    NULL, '["Bruschetta","Sumol"]',                                                         'Ready',          '2026-05-30 12:42:00'),
(11,  7, 'Table',    NULL, '["Bife à Casa","Arroz de Marisco","Batatas Fritas","Coca-Cola"]',                 'Pending',        '2026-05-30 12:45:00'),
(12,  3, 'Table',    NULL, '["Pizza Margherita","Sumol"]',                                                   'Pending',        '2026-05-30 12:46:00'),
(14, 12, 'Table',    NULL, '["Bacalhau à Brás","Salada Mista","Red Wine Glass","Pão","Café"]',                'In Preparation', '2026-05-30 12:47:00'),
( 2,  5, 'Table',    NULL, '["Caesar Salad","Grilled Salmon","Orange Juice"]',                               'Pending',        '2026-05-30 12:48:00'),
( 1, 17, 'Table',    NULL, '["Esparguete Bolonhesa","Tiramisu"]',                                            'In Preparation', '2026-05-30 12:49:00'),
( 3, 22, 'Table',    NULL, '["Chicken Wings","Coca-Cola"]',                                                  'Ready',          '2026-05-30 12:38:00'),
( 4, 21, 'Table',    NULL, '["Creme Soup","Vegetarian Pasta","Cheesecake"]',                                 'Pending',        '2026-05-30 12:50:00'),
( 5, 23, 'Table',    NULL, '["Chicken Parmigiana","Craft Beer","Tiramisu"]',                                 'In Preparation', '2026-05-30 12:51:00');

-- =========================================================================
-- 8. ORDER ITEMS
-- =========================================================================
INSERT INTO order_items (order_id, item_id, quantity) VALUES
(1023,  7, 1), (1023, 24, 1), (1023, 16, 1),
(1024, 23, 1), (1024, 14, 1),
(1025,  3, 1), (1025, 26, 1), (1025,  1, 1), (1025,  4, 1), (1025, 10, 1),
(1026,  2, 1), (1026, 19, 1), (1026, 16, 1),
(1027,  3, 1), (1027, 26, 1),
(1028, 17, 1), (1028, 18, 1), (1028, 19, 1), (1028, 25, 1),
(1029, 20, 1), (1029, 26, 1),
(1030, 21, 1), (1030, 22, 1), (1030, 15, 1), (1030, 28, 1), (1030, 27, 1),
(1031,  4, 1), (1031,  7, 1), (1031, 13, 1),
(1032,  1, 1), (1032, 11, 1),
(1033,  5, 1), (1033, 25, 1),
(1034,  6, 1), (1034,  9, 1), (1034, 12, 1),
(1035,  8, 1), (1035, 14, 1), (1035, 11, 1);

-- =========================================================================
-- 9. FATURAS (orders Delivered + Ready)
-- IVA 13% (taxa intermédia restauração Portugal)
-- =========================================================================
-- #1023 · subtotal=28.00 · tax=3.64 · total=31.64 · profit=27.48
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1023, 28.00, 3.64, 31.64, 27.48, '2026-05-30 12:54:00');

-- #1024 · subtotal=19.00 · tax=2.47 · total=21.47 · profit=18.71
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1024, 19.00, 2.47, 21.47, 18.71, '2026-05-30 12:57:00');

-- #1025 · subtotal=37.00 · tax=4.81 · total=41.81 · profit=36.40
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1025, 37.00, 4.81, 41.81, 36.40, '2026-05-30 13:02:00');

-- #1027 · subtotal=9.50 · tax=1.24 · total=10.74 · profit=9.68
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1027, 9.50, 1.24, 10.74, 9.68, '2026-05-30 13:05:00');

-- #1033 · subtotal=13.50 · tax=1.76 · total=15.26 · profit=13.03
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1033, 13.50, 1.76, 15.26, 13.03, '2026-05-30 13:08:00');

-- =========================================================================
-- 10. PAGAMENTOS
-- Delivered → Completed  |  Ready → Pending
-- =========================================================================
INSERT INTO payments (invoice_id, customer_id, amount, payment_method, payment_status, processed_at) VALUES
(1, 16, 31.64, 'MB Way',      'Completed', '2026-05-30 12:56:00'),
(2, 15, 21.47, 'Cash',        'Completed', '2026-05-30 12:59:00'),
(3, 14, 41.81, 'Multibanco',  'Pending',   NULL),
(4, 12, 10.74, 'MB Way',      'Pending',   NULL),
(5,  3, 15.26, 'Credit Card', 'Pending',   NULL);

-- =========================================================================
-- 11. NOTIFICAÇÕES
-- =========================================================================
INSERT INTO notification (customer_id, title, message, is_read, sent_at) VALUES
(16, 'Pagamento recebido',      'O seu pagamento de 31,64 € foi processado com sucesso. Obrigado!',            FALSE, '2026-05-30 12:56:30'),
(15, 'Pagamento recebido',      'O seu pagamento de 21,47 € foi processado com sucesso. Obrigado!',            FALSE, '2026-05-30 12:59:30'),
(14, 'A sua conta está pronta', 'A sua fatura de 41,81 € está disponível. Confirme o pagamento no dashboard.', FALSE, '2026-05-30 13:02:30'),
(12, 'A sua conta está pronta', 'A sua fatura de 10,74 € está disponível. Confirme o pagamento no dashboard.', FALSE, '2026-05-30 13:05:30'),
( 3, 'A sua conta está pronta', 'A sua fatura de 15,26 € está disponível. Confirme o pagamento no dashboard.', FALSE, '2026-05-30 13:08:30');
