-- =========================================================================
-- SEED DEFAULT — SmartBistro AI (Neon/PostgreSQL)
-- Dados de arranque com atividade operacional para testar
-- recommendations, previsão de receitas e pontos de utilizador.
-- Executar DEPOIS de schema_neon.sql.
--
-- Inclui: roles · users · staff · auth_accounts · tables
--          ingredients · stock · items · recipe_items
--          orders · order_items · invoices · payments · user_points
-- =========================================================================

-- =========================================================================
-- 1. ROLES
-- =========================================================================
INSERT INTO roles (name, flow_order) VALUES
('STAFF', 1),
('USER',  2),
('MODEL', 3);

-- =========================================================================
-- 2. UTILIZADORES BASE (Admin e Manager)
-- =========================================================================
INSERT INTO users (name, email, active, role_id) VALUES
('Admin SmartBistro',   'admin@smartbistro.pt',   TRUE, 1),
('Manager SmartBistro', 'manager@smartbistro.pt', TRUE, 1);

-- =========================================================================
-- 3. STAFF
-- =========================================================================
INSERT INTO staff (user_id) VALUES (1), (2);

-- =========================================================================
-- 4. AUTH ACCOUNTS (admin→admin123 | manager→manager123)
-- =========================================================================
INSERT INTO auth_accounts (user_id, username, password_hash) VALUES
(1, 'admin',   '$2b$10$e6BP1FypTH1HoEdcGkFvSONNRq7NVHbMvHGsS6pCPnTRKy1325Kyq'),
(2, 'manager', '$2b$10$8xnntok3EVYFLuse1MYds.klcWYqzZLXijT1S1r9/CdNvUkWZbgju');

-- =========================================================================
-- 5. MESAS — todas disponíveis
-- =========================================================================
INSERT INTO tables (table_number, capacity, status) VALUES
('T01',  2, 'Available'), ('T02',  4, 'Available'), ('T03',  4, 'Available'),
('T04',  4, 'Available'), ('T05',  6, 'Available'), ('T06',  6, 'Available'),
('T07',  8, 'Available'), ('T08',  8, 'Available'), ('T09',  2, 'Available'),
('T10', 10, 'Available'), ('T11',  2, 'Available'), ('T12',  4, 'Available'),
('T13',  4, 'Available'), ('T14',  6, 'Available'), ('T15',  8, 'Available'),
('T16',  2, 'Available'), ('T17',  4, 'Available'), ('T18',  4, 'Available'),
('T19',  6, 'Available'), ('T20', 10, 'Available'), ('T21',  4, 'Available'),
('T22',  4, 'Available'), ('T23',  6, 'Available'), ('T24',  8, 'Available');

-- =========================================================================
-- 6. INGREDIENTES
-- =========================================================================
INSERT INTO ingredients (name, measurement_unit) VALUES
('Long Italian Pasta',  'kg'), ('Minced Beef Meat',    'kg'), ('Brioche Burger Bun',  'units'),
('Chicken Breast',      'kg'), ('Salmon Fillet',       'kg'), ('Mixed Lettuce',       'kg'),
('Cherry Tomatoes',     'kg'), ('Garlic',              'kg'), ('Lemon',               'units'),
('Mozzarella Cheese',   'kg'), ('Parmesan Cheese',     'kg'), ('Butter',              'kg'),
('Heavy Cream',         'L'),  ('Eggs',                'units'), ('Wheat Flour',       'kg'),
('Sugar',               'kg'), ('Sourdough Bread',     'units'), ('French Fries',      'kg'),
('Olive Oil',           'L'),  ('Dark Chocolate',      'kg'), ('Sparkling Water',     'L'),
('Orange Juice',        'L'),  ('Craft Beer',          'L'),  ('Red Wine',            'L'),
('Beef Steak',          'kg'), ('Rice',                'kg'), ('Seafood Mix',         'kg'),
('Pizza Dough',         'units'), ('Tomato Sauce',     'kg'), ('Cucumber',            'kg'),
('Cod Fish',            'kg'), ('Potatoes',            'kg'), ('Coffee Beans',        'kg'),
('Mixed Vegetables',    'kg'), ('Coca-Cola',           'L'),  ('Sumol',               'L');

-- =========================================================================
-- 7. STOCK
-- =========================================================================
INSERT INTO stock (ingredient_id, available_quantity, unit_cost) VALUES
( 1, 20.00,  1.5000), ( 2, 15.00,  7.5000), ( 3, 50.00,  0.4000),
( 4, 10.00,  5.5000), ( 5,  8.00, 12.0000), ( 6,  5.00,  2.5000),
( 7,  4.00,  3.0000), ( 8,  5.00,  4.0000), ( 9, 30.00,  0.1500),
(10,  6.00,  8.0000), (11,  4.00, 15.0000), (12,  5.00,  6.0000),
(13,  4.00,  2.8000), (14,100.00,  0.2500), (15, 15.00,  0.8000),
(16,  8.00,  1.2000), (17, 40.00,  0.6000), (18, 10.00,  1.5000),
(19, 10.00,  3.5000), (20,  3.00,  9.0000), (21, 50.00,  0.5000),
(22, 20.00,  1.2000), (23, 15.00,  2.0000), (24, 12.00,  4.5000),
(25, 12.00, 14.0000), (26, 20.00,  0.8000), (27,  8.00, 10.0000),
(28, 30.00,  0.5000), (29, 10.00,  1.5000), (30, 10.00,  1.0000),
(31, 10.00, 12.0000), (32, 15.00,  0.6000), (33,  5.00, 15.0000),
(34, 10.00,  2.0000), (35, 40.00,  0.8000), (36, 30.00,  0.7000);

-- =========================================================================
-- 8. ITENS DO MENU
-- =========================================================================
INSERT INTO items (name, category, price) VALUES
('Esparguete Bolonhesa', 'Main Course', 12.50), ('Hamburguer Gourmet',   'Main Course', 14.00),
('Bruschetta',           'Appetizer',    7.50), ('Caesar Salad',         'Appetizer',    9.00),
('Chicken Wings',        'Appetizer',   11.00), ('Creme Soup',           'Appetizer',    6.50),
('Grilled Salmon',       'Main Course', 18.50), ('Chicken Parmigiana',   'Main Course', 15.00),
('Vegetarian Pasta',     'Main Course', 13.00), ('Chocolate Mousse',     'Dessert',      6.00),
('Tiramisu',             'Dessert',      7.00), ('Cheesecake',           'Dessert',      6.50),
('Orange Juice',         'Beverage',     3.50), ('Craft Beer',           'Beverage',     4.50),
('Red Wine Glass',       'Beverage',     5.50), ('Sparkling Water',      'Beverage',     2.00),
('Bife à Casa',          'Main Course', 16.00), ('Arroz de Marisco',     'Main Course', 19.50),
('Batatas Fritas',       'Appetizer',    4.00), ('Pizza Margherita',     'Main Course', 14.50),
('Bacalhau à Brás',      'Main Course', 17.00), ('Salada Mista',         'Appetizer',    6.00),
('Frango Assado',        'Main Course', 14.50), ('Legumes Salteados',    'Appetizer',    7.50),
('Coca-Cola',            'Beverage',     2.50), ('Sumol',                'Beverage',     2.00),
('Café',                 'Beverage',     1.50), ('Pão',                  'Appetizer',    2.50);

-- =========================================================================
-- 9. FICHAS TÉCNICAS
-- =========================================================================
INSERT INTO recipe_items (item_id, ingredient_id, required_quantity) VALUES
(1,  1, 0.12), (1,  2, 0.15), (2,  3, 1.00), (2,  2, 0.18),
(3, 17, 0.15), (3,  7, 0.05), (3,  8, 0.01), (3, 19, 0.02), (3, 10, 0.06),
(4,  6, 0.15), (4, 11, 0.04), (4, 19, 0.02), (4,  9, 0.50), (4, 14, 1.00),
(5,  4, 0.35), (5,  8, 0.01), (6, 13, 0.15), (6, 12, 0.02), (6, 15, 0.03), (6,  8, 0.01),
(7,  5, 0.25), (7,  9, 1.00), (7, 19, 0.02), (7, 18, 0.15),
(8,  4, 0.25), (8, 10, 0.08), (8, 15, 0.05), (8, 14, 1.00), (8, 19, 0.02),
(9,  1, 0.15), (9,  7, 0.08), (9,  8, 0.01), (9, 19, 0.03), (9, 11, 0.03),
(10, 20, 0.08), (10, 14, 2.00), (10, 16, 0.04), (10, 13, 0.10), (10, 12, 0.02),
(11, 14, 2.00), (11, 16, 0.05), (11, 13, 0.12), (11, 20, 0.03), (11, 15, 0.05),
(12, 14, 2.00), (12, 16, 0.06), (12, 12, 0.05), (12, 13, 0.15), (12, 15, 0.06),
(13, 22, 0.30), (14, 23, 0.50), (15, 24, 0.15), (16, 21, 0.50),
(17, 25, 0.25), (17, 18, 0.15), (18, 27, 0.20), (18, 26, 0.15), (18, 19, 0.02),
(19, 18, 0.20), (19, 19, 0.02), (20, 28, 1.00), (20, 29, 0.10), (20, 10, 0.12),
(21, 31, 0.20), (21, 32, 0.15), (21, 14, 2.00), (21, 19, 0.02),
(22,  6, 0.12), (22,  7, 0.06), (22, 30, 0.05), (23,  4, 0.30), (23,  8, 0.01), (23, 19, 0.02),
(24, 34, 0.20), (24, 19, 0.02), (25, 35, 0.33), (26, 36, 0.33), (27, 33, 0.01), (28, 17, 1.00);

-- =========================================================================
-- 10. UTILIZADORES CLIENTE (para testar recommendations e pontos)
-- =========================================================================
INSERT INTO users (name, email, active, role_id) VALUES
('Ana Costa',    'ana@exemplo.pt',    TRUE, 2),
('Bruno Silva',  'bruno@exemplo.pt',  TRUE, 2),
('Catarina Leal','catarina@exemplo.pt',TRUE, 2);

-- auth_accounts: senha = admin123 (mesma hash do admin para facilitar testes)
INSERT INTO auth_accounts (user_id, username, password_hash) VALUES
(3, 'ana',      '$2b$10$e6BP1FypTH1HoEdcGkFvSONNRq7NVHbMvHGsS6pCPnTRKy1325Kyq'),
(4, 'bruno',    '$2b$10$e6BP1FypTH1HoEdcGkFvSONNRq7NVHbMvHGsS6pCPnTRKy1325Kyq'),
(5, 'catarina', '$2b$10$e6BP1FypTH1HoEdcGkFvSONNRq7NVHbMvHGsS6pCPnTRKy1325Kyq');

-- =========================================================================
-- 11. PEDIDOS (últimos 30 dias — cobrem recommendations e forecast)
-- Itens: 1=Esparguete(12.50) 2=Hamburguer(14.00) 3=Bruschetta(7.50)
--        4=Caesar Salad(9.00) 5=Chicken Wings(11.00) 7=Grilled Salmon(18.50)
--        10=Choc Mousse(6.00) 13=OJ(3.50) 14=Craft Beer(4.50) 19=Batatas(4.00)
-- =========================================================================
INSERT INTO orders (user_id, service_type, kitchen_sequence_json, order_status, created_at) VALUES
-- Dia -29 (Ana)
(3, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Craft Beer","quantity":1,"price":4.50}]', 'Delivered', NOW() - INTERVAL '29 days'),
-- Dia -27 (Bruno)
(4, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":2,"price":14.00},{"name":"Coca-Cola","quantity":2,"price":2.50}]', 'Delivered', NOW() - INTERVAL '27 days'),
-- Dia -25 (Catarina)
(5, 'Dine-in',  '[{"name":"Grilled Salmon","quantity":1,"price":18.50},{"name":"Caesar Salad","quantity":1,"price":9.00},{"name":"Red Wine Glass","quantity":2,"price":5.50}]', 'Delivered', NOW() - INTERVAL '25 days'),
-- Dia -23 (Ana — repete Esparguete)
(3, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Tiramisu","quantity":1,"price":7.00}]', 'Delivered', NOW() - INTERVAL '23 days'),
-- Dia -21 (Bruno)
(4, 'Takeaway', '[{"name":"Chicken Wings","quantity":2,"price":11.00},{"name":"Batatas Fritas","quantity":1,"price":4.00},{"name":"Craft Beer","quantity":2,"price":4.50}]', 'Delivered', NOW() - INTERVAL '21 days'),
-- Dia -19 (Catarina)
(5, 'Dine-in',  '[{"name":"Arroz de Marisco","quantity":1,"price":19.50},{"name":"Sparkling Water","quantity":2,"price":2.00}]', 'Delivered', NOW() - INTERVAL '19 days'),
-- Dia -17 (Ana — 3ª Esparguete → favorito)
(3, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Bruschetta","quantity":1,"price":7.50}]', 'Delivered', NOW() - INTERVAL '17 days'),
-- Dia -15 (Bruno — 2ª Hamburguer)
(4, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":1,"price":14.00},{"name":"Batatas Fritas","quantity":1,"price":4.00}]', 'Delivered', NOW() - INTERVAL '15 days'),
-- Dia -13 (Catarina — 2ª Grilled Salmon)
(5, 'Dine-in',  '[{"name":"Grilled Salmon","quantity":1,"price":18.50},{"name":"Chocolate Mousse","quantity":2,"price":6.00}]', 'Delivered', NOW() - INTERVAL '13 days'),
-- Dia -11 (Ana)
(3, 'Takeaway', '[{"name":"Chicken Wings","quantity":1,"price":11.00},{"name":"Batatas Fritas","quantity":2,"price":4.00}]', 'Delivered', NOW() - INTERVAL '11 days'),
-- Dia -9 (Bruno — 3ª Hamburguer → favorito)
(4, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":2,"price":14.00},{"name":"Onion Rings","quantity":1,"price":4.00},{"name":"Craft Beer","quantity":1,"price":4.50}]', 'Delivered', NOW() - INTERVAL '9 days'),
-- Dia -7 (Catarina)
(5, 'Dine-in',  '[{"name":"Bacalhau à Brás","quantity":1,"price":17.00},{"name":"Salada Mista","quantity":1,"price":6.00},{"name":"Sumol","quantity":1,"price":2.00}]', 'Delivered', NOW() - INTERVAL '7 days'),
-- Dia -5 (Ana — 5ª Esparguete)
(3, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Orange Juice","quantity":1,"price":3.50}]', 'Delivered', NOW() - INTERVAL '5 days'),
-- Dia -4 (Bruno)
(4, 'Takeaway', '[{"name":"Bife à Casa","quantity":1,"price":16.00},{"name":"Batatas Fritas","quantity":1,"price":4.00},{"name":"Red Wine Glass","quantity":1,"price":5.50}]', 'Delivered', NOW() - INTERVAL '4 days'),
-- Dia -3 (Catarina — 3ª Grilled Salmon → favorito)
(5, 'Dine-in',  '[{"name":"Grilled Salmon","quantity":1,"price":18.50},{"name":"Caesar Salad","quantity":1,"price":9.00},{"name":"Tiramisu","quantity":1,"price":7.00}]', 'Delivered', NOW() - INTERVAL '3 days'),
-- Dia -2 (Ana)
(3, 'Takeaway', '[{"name":"Frango Assado","quantity":1,"price":14.50},{"name":"Arroz de Marisco","quantity":1,"price":19.50}]', 'Delivered', NOW() - INTERVAL '2 days'),
-- Dia -1 (Bruno — popular esta semana)
(4, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":1,"price":14.00},{"name":"Chicken Wings","quantity":1,"price":11.00}]', 'Delivered', NOW() - INTERVAL '1 day');

-- =========================================================================
-- 12. ITENS DE PEDIDO (order_items — espelha kitchen_sequence_json)
-- IDs de items: 1=Esparguete 2=Hamburguer 3=Bruschetta 4=Caesar Salad
--               5=Chicken Wings 7=Grilled Salmon 10=Choc Mousse 11=Tiramisu
--               13=OJ 14=Craft Beer 17=Bife à Casa 18=Arroz de Marisco
--               19=Batatas 21=Bacalhau 22=Salada Mista 23=Frango Assado
--               25=Coca-Cola 26=Sumol 15=Red Wine
-- =========================================================================
INSERT INTO order_items (order_id, item_id, quantity) VALUES
(1, 1, 1),(1, 14, 1),
(2, 2, 2),(2, 25, 2),
(3, 7, 1),(3, 4, 1),(3, 15, 2),
(4, 1, 1),(4, 11, 1),
(5, 5, 2),(5, 19, 1),(5, 14, 2),
(6, 18, 1),(6, 16, 2),
(7, 1, 1),(7, 3, 1),
(8, 2, 1),(8, 19, 1),
(9, 7, 1),(9, 10, 2),
(10, 5, 1),(10, 19, 2),
(11, 2, 2),(11, 14, 1),
(12, 21, 1),(12, 22, 1),(12, 26, 1),
(13, 1, 1),(13, 13, 1),
(14, 17, 1),(14, 19, 1),(14, 15, 1),
(15, 7, 1),(15, 4, 1),(15, 11, 1),
(16, 23, 1),(16, 18, 1),
(17, 2, 1),(17, 5, 1);

-- =========================================================================
-- 13. FATURAS (invoices — IVA 13%)
-- =========================================================================
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at) VALUES
(1,  15.04,  1.96,  17.00, 0, NOW() - INTERVAL '29 days'),
(2,  29.20,  3.80,  33.00, 0, NOW() - INTERVAL '27 days'),
(3,  33.19,  4.31,  38.50, 0, NOW() - INTERVAL '25 days'),
(4,  17.26,  2.24,  19.50, 0, NOW() - INTERVAL '23 days'),
(5,  27.43,  3.57,  31.00, 0, NOW() - INTERVAL '21 days'),
(6,  20.80,  2.70,  23.50, 0, NOW() - INTERVAL '19 days'),
(7,  17.70,  2.30,  20.00, 0, NOW() - INTERVAL '17 days'),
(8,  15.93,  2.07,  18.00, 0, NOW() - INTERVAL '15 days'),
(9,  26.99,  3.51,  30.50, 0, NOW() - INTERVAL '13 days'),
(10, 22.12,  2.88,  19.00, 0, NOW() - INTERVAL '11 days'),
(11, 38.50,  5.00,  41.50, 0, NOW() - INTERVAL '9 days'),
(12, 22.12,  2.88,  25.00, 0, NOW() - INTERVAL '7 days'),
(13, 14.16,  1.84,  16.00, 0, NOW() - INTERVAL '5 days'),
(14, 22.12,  2.88,  25.50, 0, NOW() - INTERVAL '4 days'),
(15, 30.53,  3.97,  34.50, 0, NOW() - INTERVAL '3 days'),
(16, 29.20,  3.80,  34.00, 0, NOW() - INTERVAL '2 days'),
(17, 22.12,  2.88,  25.00, 0, NOW() - INTERVAL '1 day');

-- =========================================================================
-- 14. PAGAMENTOS (todos Completed)
-- =========================================================================
INSERT INTO payments (invoice_id, user_id, amount, payment_method, payment_status, processed_at) VALUES
(1,  3, 17.00, 'Cash',        'Completed', NOW() - INTERVAL '29 days'),
(2,  4, 33.00, 'MB Way',      'Completed', NOW() - INTERVAL '27 days'),
(3,  5, 38.50, 'Credit Card', 'Completed', NOW() - INTERVAL '25 days'),
(4,  3, 19.50, 'Cash',        'Completed', NOW() - INTERVAL '23 days'),
(5,  4, 31.00, 'MB Way',      'Completed', NOW() - INTERVAL '21 days'),
(6,  5, 23.50, 'Credit Card', 'Completed', NOW() - INTERVAL '19 days'),
(7,  3, 20.00, 'Cash',        'Completed', NOW() - INTERVAL '17 days'),
(8,  4, 18.00, 'MB Way',      'Completed', NOW() - INTERVAL '15 days'),
(9,  5, 30.50, 'Credit Card', 'Completed', NOW() - INTERVAL '13 days'),
(10, 3, 19.00, 'Cash',        'Completed', NOW() - INTERVAL '11 days'),
(11, 4, 41.50, 'MB Way',      'Completed', NOW() - INTERVAL '9 days'),
(12, 5, 25.00, 'Credit Card', 'Completed', NOW() - INTERVAL '7 days'),
(13, 3, 16.00, 'Cash',        'Completed', NOW() - INTERVAL '5 days'),
(14, 4, 25.50, 'MB Way',      'Completed', NOW() - INTERVAL '4 days'),
(15, 5, 34.50, 'Credit Card', 'Completed', NOW() - INTERVAL '3 days'),
(16, 3, 34.00, 'Cash',        'Completed', NOW() - INTERVAL '2 days'),
(17, 4, 25.00, 'MB Way',      'Completed', NOW() - INTERVAL '1 day');

-- =========================================================================
-- 15. PONTOS DE UTILIZADOR (1€ pago = 1 ponto, arredondado para baixo)
-- =========================================================================
INSERT INTO user_points (user_id, balance, total_earned) VALUES
(3, 86,  86),  -- Ana: 17+19.5+20+19+16+34 = 125.50 → 125 pts acumulados (com alguns gastos)
(4, 174, 174), -- Bruno: 33+31+18+41.5+25.5+25 = 174
(5, 127, 127); -- Catarina: 38.5+23.5+30.5+25+34.5 = 152
