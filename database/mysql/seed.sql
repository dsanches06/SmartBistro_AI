-- =========================================================================
-- SEED DATA — SmartBistro AI
-- Executar DEPOIS de schema.sql (DDL puro)
-- Timestamps relativos a NOW() para demo sempre realista
-- =========================================================================

USE smartbistro;

-- =========================================================================
-- 1. ROLES
-- =========================================================================
INSERT INTO roles (name, flow_order) VALUES
('STAFF', 1),
('USER',  2),
('MODEL', 3);

-- =========================================================================
-- 2. UTILIZADORES
-- =========================================================================
-- Admin e Manager (role_id=1)
INSERT INTO users (name, email, phone, active, role_id) VALUES
('Admin SmartBistro',   'admin@smartbistro.pt',   NULL,        TRUE, 1),
('Manager SmartBistro', 'manager@smartbistro.pt', '555-0100',  TRUE, 1);

-- Utilizadores regulares (role_id=2 via DEFAULT)
INSERT INTO users (name, phone, active) VALUES
('Hugo Neto',        '555-0108', TRUE),  -- id=3
('Ana Silva',        '555-0101', TRUE),  -- id=4
('Joana Luz',        '555-0110', TRUE),  -- id=5
('Bruno Costa',      '555-0102', TRUE),  -- id=6
('Igor Lima',        '555-0109', TRUE),  -- id=7
('Carla Dias',       '555-0103', TRUE),  -- id=8
('Filipe Gil',       '555-0106', TRUE),  -- id=9
('Elena Vaz',        '555-0105', TRUE),  -- id=10
('David Reas',       '555-0104', TRUE),  -- id=11
('Gina Rosa',        '555-0107', TRUE),  -- id=12
('Ana Pereira',      '555-0111', TRUE),  -- id=13
('Carlos Silva',     '555-0112', TRUE),  -- id=14
('Manuel Santos',    '555-0113', TRUE),  -- id=15
('Mariana Costa',    '555-0114', TRUE),  -- id=16
('Pedro Almeida',    '555-0115', TRUE),  -- id=17
('Joana Martins',    '555-0116', TRUE),  -- id=18
('Danilson Sanches', '555-0120', TRUE),  -- id=19
('Abel Pinto',       '555-0155', TRUE),  -- id=20
-- Utilizadores sem mesa nem pedido (disponíveis para atribuição/reserva)
('Ricardo Fonseca',  '555-0130', TRUE),  -- id=21
('Sofia Mendes',     '555-0131', TRUE),  -- id=22
('Tiago Ferreira',   '555-0132', TRUE),  -- id=23
('Beatriz Neves',    '555-0133', TRUE),  -- id=24
('Nuno Rodrigues',   '555-0134', TRUE),  -- id=25
('Catarina Lima',    '555-0135', TRUE);  -- id=26

-- =========================================================================
-- 3. STAFF (Admin e Manager são funcionários)
-- =========================================================================
INSERT INTO staff (user_id) VALUES (1), (2);

-- =========================================================================
-- 4. AUTH ACCOUNTS (admin→admin123 | manager→manager123)
-- =========================================================================
INSERT INTO auth_accounts (user_id, username, password_hash) VALUES
(1, 'admin',   '$2b$10$e6BP1FypTH1HoEdcGkFvSONNRq7NVHbMvHGsS6pCPnTRKy1325Kyq'),
(2, 'manager', '$2b$10$8xnntok3EVYFLuse1MYds.klcWYqzZLXijT1S1r9/CdNvUkWZbgju');

-- =========================================================================
-- 5. MESAS
-- Occupied → pedido activo  |  Reserved → reserva futura  |  Available → livre
-- =========================================================================
INSERT INTO tables (table_number, capacity, status) VALUES
('T01',  2, 'Available'),
('T02',  4, 'Available'),
('T03',  4, 'Occupied'),
('T04',  4, 'Reserved'),
('T05',  6, 'Occupied'),
('T06',  6, 'Occupied'),
('T07',  8, 'Occupied'),
('T08',  8, 'Available'),
('T09',  2, 'Available'),
('T10', 10, 'Available'),
('T11',  2, 'Reserved'),
('T12',  4, 'Occupied'),
('T13',  4, 'Occupied'),
('T14',  6, 'Reserved'),
('T15',  8, 'Available'),
('T16',  2, 'Available'),
('T17',  4, 'Occupied'),
('T18',  4, 'Available'),
('T19',  6, 'Available'),
('T20', 10, 'Available'),
('T21',  4, 'Occupied'),
('T22',  4, 'Occupied'),
('T23',  6, 'Occupied'),
('T24',  8, 'Available');

-- =========================================================================
-- 6. INGREDIENTES + STOCK
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
-- 7. ITENS DO MENU + FICHAS TÉCNICAS
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
-- 8. RESERVAS (datas futuras a partir de hoje)
-- =========================================================================
INSERT INTO reservations (user_id, table_id, reservation_date, party_size, status, phone, notes) VALUES
(11, 11, DATE_ADD(CURDATE(), INTERVAL  1 DAY) + INTERVAL 19 HOUR, 2, 'Confirmed', '555-0111', NULL),
(12,  4, DATE_ADD(CURDATE(), INTERVAL  1 DAY) + INTERVAL 20 HOUR, 4, 'Confirmed', '555-0112', NULL),
(14, 14, DATE_ADD(CURDATE(), INTERVAL  1 DAY) + INTERVAL 20 HOUR + INTERVAL 30 MINUTE, 5, 'Confirmed', '555-0114', 'Sem glúten'),
(15,  2, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 12 HOUR + INTERVAL 30 MINUTE, 2, 'Pending',   '555-0115', NULL),
(16,  9, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 13 HOUR, 1, 'Pending',   '555-0116', 'Mesa na esplanada'),
(10, 10, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 19 HOUR, 8, 'Confirmed', '555-0105', 'Reunião de empresa'),
(17, 18, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, 2, 'Confirmed', '555-0115', NULL),
( 3, 16, DATE_ADD(CURDATE(), INTERVAL  3 DAY) + INTERVAL 12 HOUR, 2, 'Pending',   '555-0110', NULL),
( 4, 15, DATE_ADD(CURDATE(), INTERVAL  3 DAY) + INTERVAL 20 HOUR, 3, 'Pending',   '555-0102', NULL),
( 5, 20, DATE_ADD(CURDATE(), INTERVAL  5 DAY) + INTERVAL 13 HOUR, 9, 'Confirmed', '555-0109', 'Aniversário'),
( 6, 19, DATE_ADD(CURDATE(), INTERVAL  5 DAY) + INTERVAL 19 HOUR, 5, 'Confirmed', '555-0103', NULL),
( 7,  3, DATE_ADD(CURDATE(), INTERVAL -6 DAY) + INTERVAL 19 HOUR, 4, 'Completed', '555-0106', NULL),
( 8, 15, DATE_ADD(CURDATE(), INTERVAL -5 DAY) + INTERVAL 20 HOUR, 6, 'Completed', '555-0105', NULL),
( 9,  4, DATE_ADD(CURDATE(), INTERVAL -4 DAY) + INTERVAL 19 HOUR, 2, 'Completed', '555-0104', NULL),
(10,  6, DATE_ADD(CURDATE(), INTERVAL -8 DAY) + INTERVAL 20 HOUR, 5, 'Cancelled', '555-0107', 'Cancelado pelo utilizador');

-- =========================================================================
-- 9. PEDIDOS (KDS)
-- =========================================================================
INSERT INTO orders (user_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status, created_at) VALUES
-- DELIVERED (histórico, pago)
(16,  9, 'Table',    NULL, '["Grilled Salmon","Legumes Salteados","Sparkling Water"]',                        'Delivered',      NOW() - INTERVAL 110 MINUTE),
(15,  2, 'Table',    NULL, '["Frango Assado","Craft Beer"]',                                                 'Delivered',      NOW() - INTERVAL 95 MINUTE),
-- READY (preparado, aguarda Maître)
(14, 12, 'Table',    NULL, '["Bruschetta","Sumol","Esparguete Bolonhesa","Caesar Salad","Chocolate Mousse"]', 'Ready',          NOW() - INTERVAL 35 MINUTE),
(13, NULL,'Takeaway',NULL, '["Hamburguer Gourmet","Batatas Fritas","Sparkling Water"]',                       'Ready',          NOW() - INTERVAL 28 MINUTE),
(12,  3, 'Table',    NULL, '["Bruschetta","Sumol"]',                                                         'Ready',          NOW() - INTERVAL 25 MINUTE),
-- PENDING (Chef AI processa ao abrir o KDS)
(11,  7, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 5 MINUTE),
(12,  3, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 4 MINUTE),
(14, 12, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 3 MINUTE),
( 9,  5, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 3 MINUTE),
-- IN PREPARATION
(20, 17, 'Table',    NULL, '["Esparguete Bolonhesa","Tiramisu"]',                                            'In Preparation', NOW() - INTERVAL 18 MINUTE),
( 3, 22, 'Table',    NULL, '["Chicken Wings","Coca-Cola"]',                                                  'In Preparation', NOW() - INTERVAL 14 MINUTE),
( 4, 21, 'Table',    NULL, '["Creme Soup","Vegetarian Pasta","Cheesecake"]',                                 'In Preparation', NOW() - INTERVAL 12 MINUTE),
( 5, 23, 'Table',    NULL, '["Chicken Parmigiana","Craft Beer","Tiramisu"]',                                 'In Preparation', NOW() - INTERVAL 10 MINUTE),
-- PENDING
( 7,  6, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 2 MINUTE),
( 8, 13, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 1 MINUTE);

-- =========================================================================
-- 10. ORDER ITEMS
-- =========================================================================
INSERT INTO order_items (order_id, item_id, quantity) VALUES
( 1,  7, 1), ( 1, 24, 1), ( 1, 16, 1),
( 2, 23, 1), ( 2, 14, 1),
( 3,  3, 1), ( 3, 26, 1), ( 3,  1, 1), ( 3,  4, 1), ( 3, 10, 1),
( 4,  2, 1), ( 4, 19, 1), ( 4, 16, 1),
( 5,  3, 1), ( 5, 26, 1),
( 6, 17, 1), ( 6, 18, 1), ( 6, 19, 1), ( 6, 25, 1),
( 7, 20, 1), ( 7, 26, 1),
( 8, 21, 1), ( 8, 22, 1), ( 8, 15, 1), ( 8, 28, 1), ( 8, 27, 1),
( 9,  4, 1), ( 9,  7, 1), ( 9, 13, 1),
(10,  1, 1), (10, 11, 1),
(11,  5, 1), (11, 25, 1),
(12,  6, 1), (12,  9, 1), (12, 12, 1),
(13,  8, 1), (13, 14, 1), (13, 11, 1),
(14, 17, 1), (14, 15, 1),
(15,  4, 1), (15,  7, 1), (15, 14, 1);

-- =========================================================================
-- 11. FATURAS
-- =========================================================================
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1, 28.00, 3.64, 31.64, 27.48, NOW() - INTERVAL 90 MINUTE);
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (2, 19.00, 2.47, 21.47, 18.71, NOW() - INTERVAL 75 MINUTE);
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (3, 37.00, 4.81, 41.81, 36.40, NOW() - INTERVAL 25 MINUTE);
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (4, 20.00, 2.60, 22.60, 19.80, NOW() - INTERVAL 18 MINUTE);
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (5, 9.50, 1.24, 10.74, 9.68, NOW() - INTERVAL 15 MINUTE);

-- =========================================================================
-- 12. PAGAMENTOS
-- =========================================================================
INSERT INTO payments (invoice_id, user_id, amount, payment_method, payment_status, processed_at) VALUES
(1, 16, 31.64, 'MB Way',      'Completed', NOW() - INTERVAL 85 MINUTE),
(2, 15, 21.47, 'Cash',        'Completed', NOW() - INTERVAL 70 MINUTE),
(3, 14, 41.81, 'Multibanco',  'Pending',   NULL),
(4, 13, 22.60, 'MB Way',      'Pending',   NULL),
(5, 12, 10.74, 'Credit Card', 'Pending',   NULL);

-- =========================================================================
-- 13. NOTIFICAÇÕES
-- =========================================================================
INSERT INTO notification (user_id, title, message, is_read, sent_at) VALUES
(16, 'Pagamento recebido',      'O seu pagamento de 31,64 € foi processado com sucesso. Obrigado!',            TRUE,  NOW() - INTERVAL 85 MINUTE),
(15, 'Pagamento recebido',      'O seu pagamento de 21,47 € foi processado com sucesso. Obrigado!',            TRUE,  NOW() - INTERVAL 70 MINUTE),
(14, 'A sua conta está pronta', 'A sua fatura de 41,81 € está disponível. Pode pagar ao balcão ou via app.',   FALSE, NOW() - INTERVAL 25 MINUTE),
(13, 'A sua conta está pronta', 'A sua fatura de 22,60 € está disponível. Pode levantar o seu pedido.',        FALSE, NOW() - INTERVAL 18 MINUTE),
(12, 'A sua conta está pronta', 'A sua fatura de 10,74 € está disponível. Pode pagar ao balcão ou via app.',   FALSE, NOW() - INTERVAL 15 MINUTE);

-- =========================================================================
-- 14. PROGRAMA DE PONTOS (1€ pago = 1 ponto | mínimo 50 para resgatar)
-- =========================================================================

-- Saldos acumulados por cliente (histórico de pedidos anteriores + pedidos do seed)
INSERT INTO user_points (user_id, balance, total_earned, total_redeemed) VALUES
(3,  62,  72,  10),   -- Hugo Neto       — 62 pts (pode resgatar)
(4,  85,  85,   0),   -- Ana Silva        — 85 pts (pode resgatar)
(5,  30,  30,   0),   -- Joana Luz        — 30 pts (ainda não pode resgatar)
(6,  55,  65,  10),   -- Bruno Costa      — 55 pts (pode resgatar)
(7,  15,  15,   0),   -- Igor Lima        — 15 pts
(8,  48,  48,   0),   -- Carla Dias       — 48 pts (quase a atingir)
(9,  20,  30,  10),   -- Filipe Gil       — 20 pts
(10, 73,  83,  10),   -- Elena Vaz        — 73 pts (pode resgatar)
(11, 10,  10,   0),   -- David Reas       — 10 pts
(12, 10,  10,   0),   -- Gina Rosa        — 10 pts (pedido atual pendente)
(13, 22,  22,   0),   -- Ana Pereira      — 22 pts (pedido atual pendente)
(14, 41,  41,   0),   -- Carlos Silva     — 41 pts (pedido atual pendente)
(15, 52,  73,  21),   -- Manuel Santos    — 52 pts (pode resgatar; +21 do pedido atual pago)
(16, 55,  86,  31);   -- Mariana Costa    — 55 pts (pode resgatar; +31 do pedido atual pago)

-- Histórico de transações de pontos (últimos movimentos relevantes)
INSERT INTO points_transactions (user_id, amount, description, order_id) VALUES
(3,  50, 'Compra anterior',                NULL),
(3,  22, 'Compra anterior',                NULL),
(3, -10, 'Desconto resgatado (10 pts)',     NULL),
(4,  85, 'Acumulado ao longo de vários pedidos', NULL),
(5,  30, 'Compra anterior',                NULL),
(6,  65, 'Acumulado ao longo de vários pedidos', NULL),
(6, -10, 'Desconto resgatado (10 pts)',     NULL),
(8,  48, 'Acumulado ao longo de vários pedidos', NULL),
(10, 83, 'Acumulado ao longo de vários pedidos', NULL),
(10,-10, 'Desconto resgatado (10 pts)',     NULL),
(15, 52, 'Pedidos anteriores',             NULL),
(15, 21, 'Compra #2',                      2),
(16, 55, 'Pedidos anteriores',             NULL),
(16, 31, 'Compra #1',                      1);

-- =========================================================================
-- 15. PEDIDOS HISTÓRICOS (últimos 30 dias — para previsão de receitas e recomendações)
-- Usam utilizadores existentes: 3=Hugo 4=Ana 5=Joana 6=Bruno 7=Igor 8=Carla
-- Itens: 1=Esparguete(12.50) 2=Hamburguer(14.00) 4=Caesar Salad(9.00)
--        5=Chicken Wings(11.00) 7=Grilled Salmon(18.50) 10=Choc Mousse(6.00)
--        11=Tiramisu(7.00) 13=OJ(3.50) 14=Craft Beer(4.50) 17=Bife(16.00)
--        18=Arroz Marisco(19.50) 19=Batatas(4.00) 23=Frango(14.50) 25=Coca(2.50)
-- =========================================================================
INSERT INTO orders (user_id, service_type, kitchen_sequence_json, order_status, created_at) VALUES
(3, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Craft Beer","quantity":1,"price":4.50}]',     'Delivered', DATE_SUB(NOW(), INTERVAL 29 DAY)),
(4, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":2,"price":14.00},{"name":"Coca-Cola","quantity":2,"price":2.50}]',         'Delivered', DATE_SUB(NOW(), INTERVAL 27 DAY)),
(5, 'Takeaway', '[{"name":"Grilled Salmon","quantity":1,"price":18.50},{"name":"Caesar Salad","quantity":1,"price":9.00}]',          'Delivered', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(3, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Tiramisu","quantity":1,"price":7.00}]',        'Delivered', DATE_SUB(NOW(), INTERVAL 23 DAY)),
(6, 'Takeaway', '[{"name":"Chicken Wings","quantity":2,"price":11.00},{"name":"Batatas Fritas","quantity":1,"price":4.00}]',         'Delivered', DATE_SUB(NOW(), INTERVAL 21 DAY)),
(7, 'Takeaway', '[{"name":"Arroz de Marisco","quantity":1,"price":19.50},{"name":"Craft Beer","quantity":1,"price":4.50}]',          'Delivered', DATE_SUB(NOW(), INTERVAL 19 DAY)),
(8, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Orange Juice","quantity":1,"price":3.50}]',    'Delivered', DATE_SUB(NOW(), INTERVAL 17 DAY)),
(4, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":1,"price":14.00},{"name":"Batatas Fritas","quantity":1,"price":4.00}]',    'Delivered', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(5, 'Takeaway', '[{"name":"Grilled Salmon","quantity":1,"price":18.50},{"name":"Chocolate Mousse","quantity":2,"price":6.00}]',      'Delivered', DATE_SUB(NOW(), INTERVAL 13 DAY)),
(3, 'Takeaway', '[{"name":"Chicken Wings","quantity":1,"price":11.00},{"name":"Batatas Fritas","quantity":2,"price":4.00}]',         'Delivered', DATE_SUB(NOW(), INTERVAL 11 DAY)),
(6, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":2,"price":14.00},{"name":"Craft Beer","quantity":1,"price":4.50}]',        'Delivered', DATE_SUB(NOW(), INTERVAL  9 DAY)),
(7, 'Takeaway', '[{"name":"Bife à Casa","quantity":1,"price":16.00},{"name":"Batatas Fritas","quantity":1,"price":4.00}]',           'Delivered', DATE_SUB(NOW(), INTERVAL  7 DAY)),
(8, 'Takeaway', '[{"name":"Esparguete Bolonhesa","quantity":1,"price":12.50},{"name":"Orange Juice","quantity":1,"price":3.50}]',    'Delivered', DATE_SUB(NOW(), INTERVAL  5 DAY)),
(4, 'Takeaway', '[{"name":"Bife à Casa","quantity":1,"price":16.00},{"name":"Batatas Fritas","quantity":1,"price":4.00}]',           'Delivered', DATE_SUB(NOW(), INTERVAL  4 DAY)),
(5, 'Takeaway', '[{"name":"Grilled Salmon","quantity":1,"price":18.50},{"name":"Caesar Salad","quantity":1,"price":9.00}]',          'Delivered', DATE_SUB(NOW(), INTERVAL  3 DAY)),
(3, 'Takeaway', '[{"name":"Frango Assado","quantity":1,"price":14.50},{"name":"Arroz de Marisco","quantity":1,"price":19.50}]',      'Delivered', DATE_SUB(NOW(), INTERVAL  2 DAY)),
(6, 'Takeaway', '[{"name":"Hamburguer Gourmet","quantity":1,"price":14.00},{"name":"Chicken Wings","quantity":1,"price":11.00}]',    'Delivered', DATE_SUB(NOW(), INTERVAL  1 DAY));

-- =========================================================================
-- 16. ORDER ITEMS HISTÓRICOS (espelham kitchen_sequence_json acima)
-- IDs dos pedidos históricos começam em 16 (após os 15 do seed principal)
-- =========================================================================
INSERT INTO order_items (order_id, item_id, quantity) VALUES
(16, 1,1),(16,14,1),
(17, 2,2),(17,25,2),
(18, 7,1),(18, 4,1),
(19, 1,1),(19,11,1),
(20, 5,2),(20,19,1),
(21,18,1),(21,14,1),
(22, 1,1),(22,13,1),
(23, 2,1),(23,19,1),
(24, 7,1),(24,10,2),
(25, 5,1),(25,19,2),
(26, 2,2),(26,14,1),
(27,17,1),(27,19,1),
(28, 1,1),(28,13,1),
(29,17,1),(29,19,1),
(30, 7,1),(30, 4,1),
(31,23,1),(31,18,1),
(32, 2,1),(32, 5,1);

-- =========================================================================
-- 17. FATURAS HISTÓRICAS (IVA 13% — para previsão de receitas funcionar)
-- =========================================================================
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at) VALUES
(16, 15.04,  1.96,  17.00, 0, DATE_SUB(NOW(), INTERVAL 29 DAY)),
(17, 29.20,  3.80,  33.00, 0, DATE_SUB(NOW(), INTERVAL 27 DAY)),
(18, 24.34,  3.16,  27.50, 0, DATE_SUB(NOW(), INTERVAL 25 DAY)),
(19, 17.26,  2.24,  19.50, 0, DATE_SUB(NOW(), INTERVAL 23 DAY)),
(20, 22.12,  2.88,  25.00, 0, DATE_SUB(NOW(), INTERVAL 21 DAY)),
(21, 21.24,  2.76,  24.00, 0, DATE_SUB(NOW(), INTERVAL 19 DAY)),
(22, 14.16,  1.84,  16.00, 0, DATE_SUB(NOW(), INTERVAL 17 DAY)),
(23, 15.93,  2.07,  18.00, 0, DATE_SUB(NOW(), INTERVAL 15 DAY)),
(24, 26.99,  3.51,  30.50, 0, DATE_SUB(NOW(), INTERVAL 13 DAY)),
(25, 16.81,  2.19,  19.00, 0, DATE_SUB(NOW(), INTERVAL 11 DAY)),
(26, 36.73,  4.77,  41.50, 0, DATE_SUB(NOW(), INTERVAL  9 DAY)),
(27, 17.70,  2.30,  20.00, 0, DATE_SUB(NOW(), INTERVAL  7 DAY)),
(28, 14.16,  1.84,  16.00, 0, DATE_SUB(NOW(), INTERVAL  5 DAY)),
(29, 17.70,  2.30,  20.00, 0, DATE_SUB(NOW(), INTERVAL  4 DAY)),
(30, 24.34,  3.16,  27.50, 0, DATE_SUB(NOW(), INTERVAL  3 DAY)),
(31, 30.09,  3.91,  34.00, 0, DATE_SUB(NOW(), INTERVAL  2 DAY)),
(32, 22.12,  2.88,  25.00, 0, DATE_SUB(NOW(), INTERVAL  1 DAY));

-- =========================================================================
-- 18. PAGAMENTOS HISTÓRICOS
-- =========================================================================
INSERT INTO payments (invoice_id, user_id, amount, payment_method, payment_status, processed_at) VALUES
(6,  3, 17.00, 'Cash',        'Completed', DATE_SUB(NOW(), INTERVAL 29 DAY)),
(7,  4, 33.00, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL 27 DAY)),
(8,  5, 27.50, 'Credit Card', 'Completed', DATE_SUB(NOW(), INTERVAL 25 DAY)),
(9,  3, 19.50, 'Cash',        'Completed', DATE_SUB(NOW(), INTERVAL 23 DAY)),
(10, 6, 25.00, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL 21 DAY)),
(11, 7, 24.00, 'Cash',        'Completed', DATE_SUB(NOW(), INTERVAL 19 DAY)),
(12, 8, 16.00, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL 17 DAY)),
(13, 4, 18.00, 'Credit Card', 'Completed', DATE_SUB(NOW(), INTERVAL 15 DAY)),
(14, 5, 30.50, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL 13 DAY)),
(15, 3, 19.00, 'Cash',        'Completed', DATE_SUB(NOW(), INTERVAL 11 DAY)),
(16, 6, 41.50, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL  9 DAY)),
(17, 7, 20.00, 'Cash',        'Completed', DATE_SUB(NOW(), INTERVAL  7 DAY)),
(18, 8, 16.00, 'Credit Card', 'Completed', DATE_SUB(NOW(), INTERVAL  5 DAY)),
(19, 4, 20.00, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL  4 DAY)),
(20, 5, 27.50, 'Credit Card', 'Completed', DATE_SUB(NOW(), INTERVAL  3 DAY)),
(21, 3, 34.00, 'Cash',        'Completed', DATE_SUB(NOW(), INTERVAL  2 DAY)),
(22, 6, 25.00, 'MB Way',      'Completed', DATE_SUB(NOW(), INTERVAL  1 DAY));
