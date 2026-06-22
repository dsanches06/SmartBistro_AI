-- =========================================================================
-- SEED DEFAULT — SmartBistro AI
-- Dados de arranque sem utilizadores regulares nem atividade operacional.
-- Mesas todas livres (Available), sem reservas nem pedidos.
-- Executar DEPOIS de schema.sql.
--
-- Inclui:  roles · users (admin/manager) · staff · auth_accounts · tables
--          ingredients · stock · items · recipe_items
-- Exclui:  conversations · chat_history
--          notification · reservations · orders · order_items
--          invoices · payments · logs
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
-- 2. UTILIZADORES BASE (Admin e Manager)
-- =========================================================================
INSERT INTO users (name, email, active, role_id) VALUES
('Admin SmartBistro',   'admin@smartbistro.pt',   TRUE, 1),
('Manager SmartBistro', 'manager@smartbistro.pt', TRUE, 1);

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
-- 5. MESAS — todas disponíveis, sem ocupação nem reserva
-- =========================================================================
INSERT INTO tables (table_number, capacity, status) VALUES
('T01',  2, 'Available'),
('T02',  4, 'Available'),
('T03',  4, 'Available'),
('T04',  4, 'Available'),
('T05',  6, 'Available'),
('T06',  6, 'Available'),
('T07',  8, 'Available'),
('T08',  8, 'Available'),
('T09',  2, 'Available'),
('T10', 10, 'Available'),
('T11',  2, 'Available'),
('T12',  4, 'Available'),
('T13',  4, 'Available'),
('T14',  6, 'Available'),
('T15',  8, 'Available'),
('T16',  2, 'Available'),
('T17',  4, 'Available'),
('T18',  4, 'Available'),
('T19',  6, 'Available'),
('T20', 10, 'Available'),
('T21',  4, 'Available'),
('T22',  4, 'Available'),
('T23',  6, 'Available'),
('T24',  8, 'Available');

-- =========================================================================
-- 6. INGREDIENTES
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

-- =========================================================================
-- 7. STOCK
-- =========================================================================
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
-- 8. ITENS DO MENU
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

-- =========================================================================
-- 9. FICHAS TÉCNICAS (receitas)
-- =========================================================================
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

