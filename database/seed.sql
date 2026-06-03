-- =========================================================================
-- SEED DATA — SmartBistro AI
-- Executar DEPOIS de schema.sql (DDL puro)
-- Timestamps relativos a NOW() para demo sempre realista
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
INSERT INTO customers (id, name, phone) VALUES
(  1, 'Hugo Neto',      '555-0108'),
(  2, 'Ana Silva',      '555-0101'),
(  3, 'Joana Luz',      '555-0110'),
(  4, 'Bruno Costa',    '555-0102'),
(  5, 'Igor Lima',      '555-0109'),
(  6, 'Carla Dias',     '555-0103'),
(  7, 'Filipe Gil',     '555-0106'),
(  8, 'Elena Vaz',      '555-0105'),
(  9, 'David Reas',     '555-0104'),
( 10, 'Gina Rosa',      '555-0107'),
( 11, 'Ana Pereira',    '555-0111'),
( 12, 'Carlos Silva',   '555-0112'),
( 13, 'Manuel Santos',  '555-0113'),
( 14, 'Mariana Costa',  '555-0114'),
( 15, 'Pedro Almeida',  '555-0115'),
( 16, 'Joana Martins',  '555-0116');

-- =========================================================================
-- 3. MESAS
-- Occupied → pedido activo  |  Reserved → reserva futura  |  Available → livre
-- =========================================================================
INSERT INTO tables (table_number, capacity, status) VALUES
('T01',  2, 'Available'),   -- id=1
('T02',  4, 'Available'),   -- id=2
('T03',  4, 'Occupied'),    -- id=3   pedido #5
('T04',  4, 'Reserved'),    -- id=4   reserva confirmada esta noite
('T05',  6, 'Occupied'),    -- id=5   pedido #9
('T06',  6, 'Occupied'),    -- id=6   pedido #14
('T07',  8, 'Occupied'),    -- id=7   pedido #6
('T08',  8, 'Available'),   -- id=8
('T09',  2, 'Available'),   -- id=9
('T10', 10, 'Available'),   -- id=10
('T11',  2, 'Reserved'),    -- id=11  reserva confirmada esta noite
('T12',  4, 'Occupied'),    -- id=12  pedidos #3 e #8
('T13',  4, 'Occupied'),    -- id=13  pedido #15
('T14',  6, 'Reserved'),    -- id=14  reserva confirmada esta noite
('T15',  8, 'Available'),   -- id=15
('T16',  2, 'Available'),   -- id=16
('T17',  4, 'Occupied'),    -- id=17  pedido #10
('T18',  4, 'Available'),   -- id=18
('T19',  6, 'Reserved'),    -- id=19  reserva futura
('T20', 10, 'Available'),   -- id=20
('T21',  4, 'Occupied'),    -- id=21  pedido #12
('T22',  4, 'Occupied'),    -- id=22  pedido #11
('T23',  6, 'Occupied'),    -- id=23  pedido #13
('T24',  8, 'Available');   -- id=24

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
-- 6. RESERVAS (datas futuras a partir de hoje)
-- =========================================================================
INSERT INTO reservations (customer_id, table_id, reservation_date, party_size, status, phone, notes) VALUES
(11, 11, DATE_ADD(CURDATE(), INTERVAL  1 DAY) + INTERVAL 19 HOUR, 2, 'Confirmed', '555-0111', NULL),
(12,  4, DATE_ADD(CURDATE(), INTERVAL  1 DAY) + INTERVAL 20 HOUR, 4, 'Confirmed', '555-0112', NULL),
(14, 14, DATE_ADD(CURDATE(), INTERVAL  1 DAY) + INTERVAL 20 HOUR + INTERVAL 30 MINUTE, 5, 'Confirmed', '555-0114', 'Sem glúten'),
(15,  2, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 12 HOUR + INTERVAL 30 MINUTE, 2, 'Pending',   '555-0115', NULL),
(16,  9, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 13 HOUR, 1, 'Pending',   '555-0116', 'Mesa na esplanada'),
( 1, 10, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 19 HOUR, 8, 'Confirmed', '555-0108', 'Reunião de empresa'),
( 2, 18, DATE_ADD(CURDATE(), INTERVAL  2 DAY) + INTERVAL 19 HOUR + INTERVAL 30 MINUTE, 3, 'Confirmed', '555-0101', NULL),
( 3, 16, DATE_ADD(CURDATE(), INTERVAL  3 DAY) + INTERVAL 12 HOUR, 2, 'Pending',   '555-0110', NULL),
( 4, 15, DATE_ADD(CURDATE(), INTERVAL  3 DAY) + INTERVAL 20 HOUR, 3, 'Pending',   '555-0102', NULL),
( 5, 20, DATE_ADD(CURDATE(), INTERVAL  5 DAY) + INTERVAL 13 HOUR, 9, 'Confirmed', '555-0109', 'Aniversário'),
( 6, 19, DATE_ADD(CURDATE(), INTERVAL  5 DAY) + INTERVAL 19 HOUR, 5, 'Confirmed', '555-0103', NULL),
( 7,  3, DATE_ADD(CURDATE(), INTERVAL -6 DAY) + INTERVAL 19 HOUR, 4, 'Completed', '555-0106', NULL),
( 8, 15, DATE_ADD(CURDATE(), INTERVAL -5 DAY) + INTERVAL 20 HOUR, 6, 'Completed', '555-0105', NULL),
( 9,  4, DATE_ADD(CURDATE(), INTERVAL -4 DAY) + INTERVAL 19 HOUR, 2, 'Completed', '555-0104', NULL),
(10,  6, DATE_ADD(CURDATE(), INTERVAL -8 DAY) + INTERVAL 20 HOUR, 5, 'Cancelled', '555-0107', 'Cancelado pelo cliente');

-- =========================================================================
-- 7. PEDIDOS (KDS)
--
-- Estados para demo com Chef AI:
--   Delivered      → histórico (pago, concluído)           — 90-120 min atrás
--   Ready          → preparado, aguarda entrega do Maître  — 25-35 min atrás
--   In Preparation → Chef a preparar (updated_at = NOW())  — 10-20 min atrás (criado); timer KDS usa updated_at
--   Pending        → Chef AI processa ao abrir KDS         — 2-5 min atrás
--
-- NOTA: updated_at é auto-set a NOW() no INSERT (ON UPDATE CURRENT_TIMESTAMP),
--       por isso os pedidos "In Preparation" mostram o countdown correcto no KDS.
-- =========================================================================
INSERT INTO orders (customer_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status, created_at) VALUES
-- ── DELIVERED (histórico, pago) ──────────────────────────────────────────
(16,  9, 'Table',    NULL, '["Grilled Salmon","Legumes Salteados","Sparkling Water"]',                        'Delivered',      NOW() - INTERVAL 110 MINUTE), -- #1  T09
(15,  2, 'Table',    NULL, '["Frango Assado","Craft Beer"]',                                                 'Delivered',      NOW() - INTERVAL 95 MINUTE),  -- #2  T02

-- ── READY (preparado, aguarda Maître) ────────────────────────────────────
(14, 12, 'Table',    NULL, '["Bruschetta","Sumol","Esparguete Bolonhesa","Caesar Salad","Chocolate Mousse"]', 'Ready',          NOW() - INTERVAL 35 MINUTE),  -- #3  T12
(13, NULL,'Takeaway',NULL, '["Hamburguer Gourmet","Batatas Fritas","Sparkling Water"]',                       'Ready',          NOW() - INTERVAL 28 MINUTE),  -- #4  Takeaway
(12,  3, 'Table',    NULL, '["Bruschetta","Sumol"]',                                                         'Ready',          NOW() - INTERVAL 25 MINUTE),  -- #5  T03

-- ── PENDING (Chef AI processa ao abrir o KDS) ────────────────────────────
(11,  7, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 5 MINUTE),   -- #6  T07
(12,  3, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 4 MINUTE),   -- #7  T03
(14, 12, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 3 MINUTE),   -- #8  T12
( 2,  5, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 3 MINUTE),   -- #9  T05

-- ── IN PREPARATION (Chef já processou — countdown no KDS usa updated_at = NOW()) ──
( 1, 17, 'Table',    NULL, '["Esparguete Bolonhesa","Tiramisu"]',                                            'In Preparation', NOW() - INTERVAL 18 MINUTE),  -- #10 T17
( 3, 22, 'Table',    NULL, '["Chicken Wings","Coca-Cola"]',                                                  'In Preparation', NOW() - INTERVAL 14 MINUTE),  -- #11 T22
( 4, 21, 'Table',    NULL, '["Creme Soup","Vegetarian Pasta","Cheesecake"]',                                 'In Preparation', NOW() - INTERVAL 12 MINUTE),  -- #12 T21
( 5, 23, 'Table',    NULL, '["Chicken Parmigiana","Craft Beer","Tiramisu"]',                                 'In Preparation', NOW() - INTERVAL 10 MINUTE),  -- #13 T23

-- ── PENDING (Chef AI processa ao abrir o KDS) ────────────────────────────
( 7,  6, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 2 MINUTE),   -- #14 T06
( 8, 13, 'Table',    NULL, '[]',                                                                             'Pending',        NOW() - INTERVAL 1 MINUTE);   -- #15 T13

-- =========================================================================
-- 8. ORDER ITEMS
-- =========================================================================
INSERT INTO order_items (order_id, item_id, quantity) VALUES
-- #1  Grilled Salmon, Legumes Salteados, Sparkling Water
( 1,  7, 1), ( 1, 24, 1), ( 1, 16, 1),
-- #2  Frango Assado, Craft Beer
( 2, 23, 1), ( 2, 14, 1),
-- #3  Bruschetta, Sumol, Esparguete Bolonhesa, Caesar Salad, Chocolate Mousse
( 3,  3, 1), ( 3, 26, 1), ( 3,  1, 1), ( 3,  4, 1), ( 3, 10, 1),
-- #4  Hamburguer Gourmet, Batatas Fritas, Sparkling Water
( 4,  2, 1), ( 4, 19, 1), ( 4, 16, 1),
-- #5  Bruschetta, Sumol
( 5,  3, 1), ( 5, 26, 1),
-- #6  Bife à Casa, Arroz de Marisco, Batatas Fritas, Coca-Cola
( 6, 17, 1), ( 6, 18, 1), ( 6, 19, 1), ( 6, 25, 1),
-- #7  Pizza Margherita, Sumol
( 7, 20, 1), ( 7, 26, 1),
-- #8  Bacalhau à Brás, Salada Mista, Red Wine Glass, Pão, Café
( 8, 21, 1), ( 8, 22, 1), ( 8, 15, 1), ( 8, 28, 1), ( 8, 27, 1),
-- #9  Caesar Salad, Grilled Salmon, Orange Juice
( 9,  4, 1), ( 9,  7, 1), ( 9, 13, 1),
-- #10 Esparguete Bolonhesa, Tiramisu
(10,  1, 1), (10, 11, 1),
-- #11 Chicken Wings, Coca-Cola
(11,  5, 1), (11, 25, 1),
-- #12 Creme Soup, Vegetarian Pasta, Cheesecake
(12,  6, 1), (12,  9, 1), (12, 12, 1),
-- #13 Chicken Parmigiana, Craft Beer, Tiramisu
(13,  8, 1), (13, 14, 1), (13, 11, 1),
-- #14 Bife à Casa, Red Wine Glass
(14, 17, 1), (14, 15, 1),
-- #15 Caesar Salad, Grilled Salmon, Craft Beer
(15,  4, 1), (15,  7, 1), (15, 14, 1);

-- =========================================================================
-- 9. FATURAS (apenas Delivered + Ready com fatura)
-- IVA 13% (taxa intermédia restauração Portugal)
-- =========================================================================
-- #1  Grilled Salmon(18.50)+Legumes Salteados(7.50)+Sparkling Water(2.00) = 28.00
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (1, 28.00, 3.64, 31.64, 27.48, NOW() - INTERVAL 90 MINUTE);

-- #2  Frango Assado(14.50)+Craft Beer(4.50) = 19.00
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (2, 19.00, 2.47, 21.47, 18.71, NOW() - INTERVAL 75 MINUTE);

-- #3  Bruschetta(7.50)+Sumol(2.00)+EspBol(12.50)+Caesar(9.00)+ChoMousse(6.00) = 37.00
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (3, 37.00, 4.81, 41.81, 36.40, NOW() - INTERVAL 25 MINUTE);

-- #4  Hamburguer(14.00)+Batatas(4.00)+Sparkling(2.00) = 20.00
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (4, 20.00, 2.60, 22.60, 19.80, NOW() - INTERVAL 18 MINUTE);

-- #5  Bruschetta(7.50)+Sumol(2.00) = 9.50
INSERT INTO invoices (order_id, subtotal_amount, tax_amount, total_amount, profit_margin, issued_at)
VALUES (5, 9.50, 1.24, 10.74, 9.68, NOW() - INTERVAL 15 MINUTE);

-- =========================================================================
-- 10. PAGAMENTOS
-- Delivered → Completed  |  Ready → Pending (cliente ainda não pagou)
-- =========================================================================
INSERT INTO payments (invoice_id, customer_id, amount, payment_method, payment_status, processed_at) VALUES
(1, 16, 31.64, 'MB Way',      'Completed', NOW() - INTERVAL 85 MINUTE),  -- #1 Delivered ✓
(2, 15, 21.47, 'Cash',        'Completed', NOW() - INTERVAL 70 MINUTE),  -- #2 Delivered ✓
(3, 14, 41.81, 'Multibanco',  'Pending',   NULL),                         -- #3 Ready, aguarda pagamento
(4, 13, 22.60, 'MB Way',      'Pending',   NULL),                         -- #4 Ready Takeaway
(5, 12, 10.74, 'Credit Card', 'Pending',   NULL);                         -- #5 Ready, aguarda pagamento

-- =========================================================================
-- 11. NOTIFICAÇÕES
-- =========================================================================
INSERT INTO notification (customer_id, title, message, is_read, sent_at) VALUES
(16, 'Pagamento recebido',      'O seu pagamento de 31,64 € foi processado com sucesso. Obrigado!',            TRUE,  NOW() - INTERVAL 85 MINUTE),
(15, 'Pagamento recebido',      'O seu pagamento de 21,47 € foi processado com sucesso. Obrigado!',            TRUE,  NOW() - INTERVAL 70 MINUTE),
(14, 'A sua conta está pronta', 'A sua fatura de 41,81 € está disponível. Pode pagar ao balcão ou via app.',   FALSE, NOW() - INTERVAL 25 MINUTE),
(13, 'A sua conta está pronta', 'A sua fatura de 22,60 € está disponível. Pode levantar o seu pedido.',        FALSE, NOW() - INTERVAL 18 MINUTE),
(12, 'A sua conta está pronta', 'A sua fatura de 10,74 € está disponível. Pode pagar ao balcão ou via app.',   FALSE, NOW() - INTERVAL 15 MINUTE);
