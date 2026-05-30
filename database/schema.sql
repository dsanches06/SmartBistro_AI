DROP DATABASE IF EXISTS smartbistro;
CREATE DATABASE smartbistro;
USE smartbistro;

/* =========================================================================
   1. TABELAS DE UTILIZADORES, CHAT E INFRAESTRUTURA
   ========================================================================= */

CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL,
    flow_order INT
);

-- Clientes
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    gender ENUM('Male', 'Female', 'Other', 'Not specified') DEFAULT 'Not specified',
    role_id INT DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id)
        REFERENCES roles (id)
);

-- Sessões de Chat 
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id)
        REFERENCES customers (id)
        ON DELETE CASCADE
);

-- Histórico de Mensagens
CREATE TABLE chat_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    role_id INT NOT NULL, 
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- Notificações (Onde o utilizador verá o alerta para pagar no dashboard)
CREATE TABLE notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id) ON DELETE CASCADE
);

-- Mesas
CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(50) NOT NULL UNIQUE,
    capacity INT DEFAULT 4,
    status ENUM('Available', 'Occupied', 'Reserved') DEFAULT 'Available'
);

-- Reservas
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    table_id INT NULL,
    reservation_date DATETIME NOT NULL,
    party_size INT DEFAULT 1,
    status ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') DEFAULT 'Pending',
    phone VARCHAR(20) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);

/* =========================================================================
   2. TABELAS DE PRODUTOS, INVENTÁRIO E FICHA TÉCNICA
   ========================================================================= */

-- Itens do Menu (Erro do espaço em branco no ENUM corrigido aqui!)
CREATE TABLE items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category ENUM('Appetizer', 'Main Course', 'Dessert', 'Beverage') NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Ingredientes (Catálogo Geral de Insumos)
CREATE TABLE ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    measurement_unit VARCHAR(20) NOT NULL
);

-- Stock (Controlo de Inventário Físico e Custos)
CREATE TABLE stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT NOT NULL UNIQUE,
    available_quantity DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    unit_cost DECIMAL(10,4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Ficha Técnica / Receita
CREATE TABLE recipe_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    required_quantity DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

/* =========================================================================
   3. TABELAS DE MOVIMENTAÇÃO, FATURAÇÃO, LOGS E NOVA TABELA DE PAGAMENTOS
   ========================================================================= */

-- Pedidos (Orders - KDS)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    table_id INT NULL,                     -- Fica NULL se for um pedido de Takeaway
    service_type ENUM('Table', 'Takeaway') NOT NULL, -- Identifica claramente a origem
    allergy_restrictions TEXT,
    kitchen_sequence_json JSON NOT NULL,
    order_status ENUM('Pending', 'In Preparation', 'Ready', 'Done', 'Delivered', 'Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);


-- Itens do Pedido
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- Faturas (Invoices - Gerado pelo Agente 3)
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    subtotal_amount DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    profit_margin DECIMAL(10,2) NOT NULL,
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

--  Pagamentos (Payments)
-- Regista a transação acionada quando o utilizador aceita o pagamento no dashboard
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL, -- Ligação direta com o cliente adicionada aqui!
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('MB Way', 'Multibanco', 'Credit Card', 'Cash') DEFAULT 'MB Way',
    payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    processed_at DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);


-- Logs (Pipeline de Agentes)
CREATE TABLE logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NULL,
    agent_name VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    input_payload JSON,
    output_payload JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- =========================================================================
-- 4. POVOAMENTO DE DADOS INICIAIS DE TESTE (SEED DATA)
-- =========================================================================

INSERT INTO roles (id, name, flow_order) VALUES 
(1,'ADMIN',1), (2,'USER',2), (3,'MODEL',3);

INSERT INTO customers (id, name, email, phone, gender) VALUES
(1, 'Hugo Neto', 'hugo@dev.com', '555-0108', 'Male'),
(2, 'Ana Silva', 'ana@dev.com', '555-0101', 'Female'),
(3, 'Joana Luz', 'joana@dev.com', '555-0110', 'Female'),
(4, 'Bruno Costa', 'bruno@dev.com', '555-0102', 'Male'),
(5, 'Igor Lima', 'igor@dev.com', '555-0109', 'Male'),
(6, 'Carla Dias', 'carla@dev.com', '555-0103', 'Female'),
(7, 'Filipe Gil', 'filipe@dev.com', '555-0106', 'Male'),
(8, 'Elena Vaz', 'elena@dev.com', '555-0105', 'Female'),
(9, 'David Reas', 'david@dev.com', '555-0104', 'Male'),
(10, 'Gina Rosa', 'gina@dev.com', '555-0107', 'Female');

-- Mesas do restaurante (status inicial = Available; os Agentes atualizam em runtime)
INSERT INTO tables (table_number, capacity, status) VALUES
('T01', 2, 'Available'),   -- id 1  · Mesa pequena (2 lugares)
('T02', 4, 'Available'),   -- id 2  · Mesa standard
('T03', 4, 'Available'),   -- id 3  · Mesa standard
('T04', 4, 'Available'),   -- id 4  · Mesa standard
('T05', 6, 'Available'),   -- id 5  · Mesa média
('T06', 6, 'Occupied'),   -- id 6  · Mesa média
('T07', 8, 'Available'),   -- id 7  · Mesa grande
('T08', 8, 'Available'),   -- id 8  · Mesa grande
('T09', 2, 'Available'),   -- id 9  · Mesa pequena (esplanada)
('T10', 10, 'Available'),  -- id 10 · Mesa de grupo / eventos
('T11', 2, 'Reserved'),   -- id 11  · Mesa pequena
('T12', 4, 'Available'),   -- id 12  · Mesa standard
('T13', 4, 'Occupied'),   -- id 13  · Mesa standard
('T14', 6, 'Reserved'),   -- id 14  · Mesa média
('T15', 8, 'Available'),   -- id 15  · Mesa grande
('T16', 2, 'Reserved'),   -- id 16  · Mesa pequena (janela)
('T17', 4, 'Available'),   -- id 17  · Mesa standard
('T18', 4, 'Available'),   -- id 18  · Mesa standard
('T19', 6, 'Reserved'),   -- id 19  · Mesa média
('T20', 10, 'Available'),  -- id 20  · Mesa de grupo / eventos
('T21', 4, 'Available'),   -- id 22  · Mesa standard
('T22', 4, 'Available'),   -- id 23  · Mesa standard
('T23', 6, 'Available'),   -- id 24  · Mesa média
('T24', 8, 'Available');   -- id 25  · Mesa grande


-- Ingredientes base (existentes)
INSERT INTO ingredients (name, measurement_unit) VALUES
('Long Italian Pasta', 'kg'),   -- id 1
('Minced Beef Meat',   'kg'),   -- id 2
('Brioche Burger Bun', 'units'),-- id 3
-- Proteínas
('Chicken Breast', 'kg'),       -- id 4
('Salmon Fillet',  'kg'),       -- id 5
-- Vegetais & Frescos
('Mixed Lettuce',   'kg'),      -- id 6
('Cherry Tomatoes', 'kg'),      -- id 7
('Garlic',          'kg'),      -- id 8
('Lemon',           'units'),   -- id 9
-- Lacticínios & Gorduras
('Mozzarella Cheese', 'kg'),    -- id 10
('Parmesan Cheese',   'kg'),    -- id 11
('Butter',            'kg'),    -- id 12
('Heavy Cream',       'L'),     -- id 13
('Eggs',              'units'), -- id 14
-- Secos & Panificação
('Wheat Flour',    'kg'),       -- id 15
('Sugar',          'kg'),       -- id 16
('Sourdough Bread','units'),    -- id 17
('French Fries',   'kg'),       -- id 18
-- Líquidos & Condimentos
('Olive Oil',      'L'),        -- id 19
('Dark Chocolate', 'kg'),       -- id 20
-- Bebidas (stock de barman)
('Sparkling Water', 'L'),       -- id 21
('Orange Juice',    'L'),       -- id 22
('Craft Beer',      'L'),       -- id 23
('Red Wine',        'L');       -- id 24

-- -------------------------------------------------------------------------
-- STOCK — Quantidade disponível e custo unitário (ingredientes base + novos)
-- -------------------------------------------------------------------------
INSERT INTO stock (ingredient_id, available_quantity, unit_cost) VALUES
-- Base
(1, 20.00,  1.5000),   -- Long Italian Pasta
(2, 15.00,  7.5000),   -- Minced Beef Meat
(3, 50.00,  0.4000),   -- Brioche Burger Bun
-- Proteínas
(4, 10.00,  5.5000),   -- Chicken Breast
(5,  8.00, 12.0000),   -- Salmon Fillet
-- Vegetais & Frescos
(6,  5.00,  2.5000),   -- Mixed Lettuce
(7,  4.00,  3.0000),   -- Cherry Tomatoes
(8,  5.00,  4.0000),   -- Garlic
(9, 30.00,  0.1500),   -- Lemon
-- Lacticínios & Gorduras
(10,  6.00,  8.0000),  -- Mozzarella Cheese
(11,  4.00, 15.0000),  -- Parmesan Cheese
(12,  5.00,  6.0000),  -- Butter
(13,  4.00,  2.8000),  -- Heavy Cream
(14, 100.00, 0.2500),  -- Eggs
-- Secos & Panificação
(15, 15.00,  0.8000),  -- Wheat Flour
(16,  8.00,  1.2000),  -- Sugar
(17, 40.00,  0.6000),  -- Sourdough Bread
(18, 10.00,  1.5000),  -- French Fries
-- Líquidos
(19, 10.00,  3.5000),  -- Olive Oil
(20,  3.00,  9.0000),  -- Dark Chocolate
-- Bebidas
(21, 50.00,  0.5000),  -- Sparkling Water
(22, 20.00,  1.2000),  -- Orange Juice
(23, 15.00,  2.0000),  -- Craft Beer
(24, 12.00,  4.5000);  -- Red Wine

-- -------------------------------------------------------------------------
-- ITENS DO MENU — Catálogo completo por categoria
-- -------------------------------------------------------------------------
INSERT INTO items (name, category, price) VALUES
-- Pratos base (existentes)
('Esparguete Bolonhesa', 'Main Course', 12.50),   -- id 1
('Hamburguer Gourmet',   'Main Course', 14.00),   -- id 2
-- Entradas
('Bruschetta',    'Appetizer',  7.50),  -- id 3
('Caesar Salad',  'Appetizer',  9.00),  -- id 4
('Chicken Wings', 'Appetizer', 11.00),  -- id 5
('Creme Soup',    'Appetizer',  6.50),  -- id 6
-- Pratos Principais
('Grilled Salmon',     'Main Course', 18.50),  -- id 7
('Chicken Parmigiana', 'Main Course', 15.00),  -- id 8
('Vegetarian Pasta',   'Main Course', 13.00),  -- id 9
-- Sobremesas
('Chocolate Mousse', 'Dessert', 6.00),  -- id 10
('Tiramisu',         'Dessert', 7.00),  -- id 11
('Cheesecake',       'Dessert', 6.50),  -- id 12
-- Bebidas
('Orange Juice',    'Beverage', 3.50),  -- id 13
('Craft Beer',      'Beverage', 4.50),  -- id 14
('Red Wine Glass',  'Beverage', 5.50),  -- id 15
('Sparkling Water', 'Beverage', 2.00);  -- id 16

-- -------------------------------------------------------------------------
-- FICHAS TÉCNICAS — Ingredientes e quantidades por prato (todos os itens)
-- -------------------------------------------------------------------------
INSERT INTO recipe_items (item_id, ingredient_id, required_quantity) VALUES
-- Esparguete Bolonhesa (id 1)
(1,  1, 0.12),  -- Long Italian Pasta   0.12 kg
(1,  2, 0.15),  -- Minced Beef Meat     0.15 kg
-- Hamburguer Gourmet (id 2)
(2,  3, 1.00),  -- Brioche Burger Bun   1.00 unit
(2,  2, 0.18),  -- Minced Beef Meat     0.18 kg
-- Bruschetta (id 3)
(3, 17, 0.15),  -- Sourdough Bread      0.15 units
(3,  7, 0.05),  -- Cherry Tomatoes      0.05 kg
(3,  8, 0.01),  -- Garlic               0.01 kg
(3, 19, 0.02),  -- Olive Oil            0.02 L
(3, 10, 0.06),  -- Mozzarella Cheese    0.06 kg
-- Caesar Salad (id 4)
(4,  6, 0.15),  -- Mixed Lettuce        0.15 kg
(4, 11, 0.04),  -- Parmesan Cheese      0.04 kg
(4, 19, 0.02),  -- Olive Oil            0.02 L
(4,  9, 0.50),  -- Lemon                0.50 units
(4, 14, 1.00),  -- Eggs                 1.00 units
-- Chicken Wings (id 5)
(5,  4, 0.35),  -- Chicken Breast       0.35 kg
(5,  8, 0.01),  -- Garlic               0.01 kg
-- Creme Soup (id 6)
(6, 13, 0.15),  -- Heavy Cream          0.15 L
(6, 12, 0.02),  -- Butter               0.02 kg
(6, 15, 0.03),  -- Wheat Flour          0.03 kg
(6,  8, 0.01),  -- Garlic               0.01 kg
-- Grilled Salmon (id 7)
(7,  5, 0.25),  -- Salmon Fillet        0.25 kg
(7,  9, 1.00),  -- Lemon                1.00 units
(7, 19, 0.02),  -- Olive Oil            0.02 L
(7, 18, 0.15),  -- French Fries         0.15 kg
-- Chicken Parmigiana (id 8)
(8,  4, 0.25),  -- Chicken Breast       0.25 kg
(8, 10, 0.08),  -- Mozzarella Cheese    0.08 kg
(8, 15, 0.05),  -- Wheat Flour          0.05 kg
(8, 14, 1.00),  -- Eggs                 1.00 units
(8, 19, 0.02),  -- Olive Oil            0.02 L
-- Vegetarian Pasta (id 9)
(9,  1, 0.15),  -- Long Italian Pasta   0.15 kg
(9,  7, 0.08),  -- Cherry Tomatoes      0.08 kg
(9,  8, 0.01),  -- Garlic               0.01 kg
(9, 19, 0.03),  -- Olive Oil            0.03 L
(9, 11, 0.03),  -- Parmesan Cheese      0.03 kg
-- Chocolate Mousse (id 10)
(10, 20, 0.08), -- Dark Chocolate       0.08 kg
(10, 14, 2.00), -- Eggs                 2.00 units
(10, 16, 0.04), -- Sugar                0.04 kg
(10, 13, 0.10), -- Heavy Cream          0.10 L
(10, 12, 0.02), -- Butter               0.02 kg
-- Tiramisu (id 11)
(11, 14, 2.00), -- Eggs                 2.00 units
(11, 16, 0.05), -- Sugar                0.05 kg
(11, 13, 0.12), -- Heavy Cream          0.12 L
(11, 20, 0.03), -- Dark Chocolate       0.03 kg
(11, 15, 0.05), -- Wheat Flour          0.05 kg
-- Cheesecake (id 12)
(12, 14, 2.00), -- Eggs                 2.00 units
(12, 16, 0.06), -- Sugar                0.06 kg
(12, 12, 0.05), -- Butter               0.05 kg
(12, 13, 0.15), -- Heavy Cream          0.15 L
(12, 15, 0.06), -- Wheat Flour          0.06 kg
-- Bebidas — direto do stock de barman
(13, 22, 0.30), -- Orange Juice         0.30 L
(14, 23, 0.50), -- Craft Beer           0.50 L
(15, 24, 0.15), -- Red Wine             0.15 L
(16, 21, 0.50); -- Sparkling Water      0.50 L

-- =========================================================================
-- 5. NOVOS INGREDIENTES PARA ITENS ADICIONAIS DO MENU
-- =========================================================================

INSERT INTO ingredients (name, measurement_unit) VALUES
('Beef Steak',       'kg'),      -- id 25
('Rice',             'kg'),      -- id 26
('Seafood Mix',      'kg'),      -- id 27
('Pizza Dough',      'units'),   -- id 28
('Tomato Sauce',     'kg'),      -- id 29
('Cucumber',         'kg'),      -- id 30
('Cod Fish',         'kg'),      -- id 31
('Potatoes',         'kg'),      -- id 32
('Coffee Beans',     'kg'),      -- id 33
('Mixed Vegetables', 'kg'),      -- id 34
('Coca-Cola',        'L'),       -- id 35
('Sumol',            'L');       -- id 36

INSERT INTO stock (ingredient_id, available_quantity, unit_cost) VALUES
(25, 12.00, 14.0000),  -- Beef Steak
(26, 20.00,  0.8000),  -- Rice
(27,  8.00, 10.0000),  -- Seafood Mix
(28, 30.00,  0.5000),  -- Pizza Dough
(29, 10.00,  1.5000),  -- Tomato Sauce
(30, 10.00,  1.0000),  -- Cucumber
(31, 10.00, 12.0000),  -- Cod Fish
(32, 15.00,  0.6000),  -- Potatoes
(33,  5.00, 15.0000),  -- Coffee Beans
(34, 10.00,  2.0000),  -- Mixed Vegetables
(35, 40.00,  0.8000),  -- Coca-Cola
(36, 30.00,  0.7000);  -- Sumol

-- =========================================================================
-- 6. NOVOS ITENS DO MENU
-- =========================================================================

INSERT INTO items (name, category, price) VALUES
('Bife à Casa',       'Main Course', 16.00),  -- id 17
('Arroz de Marisco',  'Main Course', 19.50),  -- id 18
('Batatas Fritas',    'Appetizer',    4.00),  -- id 19
('Pizza Margherita',  'Main Course', 14.50),  -- id 20
('Bacalhau à Brás',   'Main Course', 17.00),  -- id 21
('Salada Mista',      'Appetizer',    6.00),  -- id 22
('Frango Assado',     'Main Course', 14.50),  -- id 23
('Legumes Salteados', 'Appetizer',    7.50),  -- id 24
('Coca-Cola',         'Beverage',     2.50),  -- id 25
('Sumol',             'Beverage',     2.00),  -- id 26
('Café',              'Beverage',     1.50),  -- id 27
('Pão',               'Appetizer',    2.50);  -- id 28

INSERT INTO recipe_items (item_id, ingredient_id, required_quantity) VALUES
-- Bife à Casa (id 17)
(17, 25, 0.25), (17, 18, 0.15),
-- Arroz de Marisco (id 18)
(18, 27, 0.20), (18, 26, 0.15), (18, 19, 0.02),
-- Batatas Fritas (id 19)
(19, 18, 0.20), (19, 19, 0.02),
-- Pizza Margherita (id 20)
(20, 28, 1.00), (20, 29, 0.10), (20, 10, 0.12),
-- Bacalhau à Brás (id 21)
(21, 31, 0.20), (21, 32, 0.15), (21, 14, 2.00), (21, 19, 0.02),
-- Salada Mista (id 22)
(22,  6, 0.12), (22,  7, 0.06), (22, 30, 0.05),
-- Frango Assado (id 23)
(23,  4, 0.30), (23,  8, 0.01), (23, 19, 0.02),
-- Legumes Salteados (id 24)
(24, 34, 0.20), (24, 19, 0.02),
-- Coca-Cola (id 25)
(25, 35, 0.33),
-- Sumol (id 26)
(26, 36, 0.33),
-- Café (id 27)
(27, 33, 0.01),
-- Pão (id 28)
(28, 17, 1.00);

-- =========================================================================
-- 7. NOVOS CLIENTES (NOMES VISÍVEIS NA IMAGEM DO KDS)
-- =========================================================================

INSERT INTO customers (id, name, email, phone, gender) VALUES
(11, 'Ana Pereira',   'ana.pereira@dev.com',  '555-0111', 'Female'),
(12, 'Carlos Silva',  'carlos@dev.com',        '555-0112', 'Male'),
(13, 'Manuel Santos', 'manuel@dev.com',        '555-0113', 'Male'),
(14, 'Mariana Costa', 'mariana@dev.com',       '555-0114', 'Female'),
(15, 'Pedro Almeida', 'pedro@dev.com',         '555-0115', 'Male'),
(16, 'Joana Martins', 'joana.martins@dev.com', '555-0116', 'Female');

-- =========================================================================
-- 8. RESERVAS
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
-- 9. PEDIDOS KDS (AUTO_INCREMENT = 1023 para coincidir com a imagem)
-- =========================================================================

ALTER TABLE orders AUTO_INCREMENT = 1023;

-- Inserção por ordem de ID: 1023 → 1035
INSERT INTO orders (customer_id, table_id, service_type, allergy_restrictions, kitchen_sequence_json, order_status, created_at) VALUES
-- #1023 · Joana Martins · Mesa 9 · A CAMINHO
(16,  9, 'Table',    NULL, '["Grilled Salmon","Legumes Salteados","Sparkling Water"]',                        'Delivered',      '2026-05-30 12:33:00'),
-- #1024 · Pedro Almeida · Mesa 2 · A CAMINHO
(15,  2, 'Table',    NULL, '["Frango Assado","Craft Beer"]',                                                 'Delivered',      '2026-05-30 12:36:00'),
-- #1025 · Mariana Costa · Mesa 12 · PRONTO
(14, 12, 'Table',    NULL, '["Bruschetta","Sumol","Esparguete Bolonhesa","Caesar Salad","Chocolate Mousse"]', 'Ready',          '2026-05-30 10:37:00'),
-- #1026 · Manuel Santos · Takeaway · EM PREPARAÇÃO
(13, NULL,'Takeaway',NULL, '["Hamburguer Gourmet","Batatas Fritas","Sparkling Water"]',                       'In Preparation', '2026-05-30 12:40:00'),
-- #1027 · Carlos Silva · Mesa 3 · PRONTO
(12,  3, 'Table',    NULL, '["Bruschetta","Sumol"]',                                                         'Ready',          '2026-05-30 12:42:00'),
-- #1028 · Ana Pereira · Mesa 7 · NOVO
(11,  7, 'Table',    NULL, '["Bife à Casa","Arroz de Marisco","Batatas Fritas","Coca-Cola"]',                 'Pending',        '2026-05-30 12:45:00'),
-- #1029 · Carlos Silva · Mesa 3 · NOVO
(12,  3, 'Table',    NULL, '["Pizza Margherita","Sumol"]',                                                   'Pending',        '2026-05-30 12:46:00'),
-- #1030 · Mariana Costa · Mesa 12 · EM PREPARAÇÃO
(14, 12, 'Table',    NULL, '["Bacalhau à Brás","Salada Mista","Red Wine Glass","Pão","Café"]',                'In Preparation', '2026-05-30 12:47:00'),
-- #1031 · Ana Silva · Mesa 5 · NOVO
( 2,  5, 'Table',    NULL, '["Caesar Salad","Grilled Salmon","Orange Juice"]',                               'Pending',        '2026-05-30 12:48:00'),
-- #1032 · Hugo Neto · Mesa 17 · EM PREPARAÇÃO
( 1, 17, 'Table',    NULL, '["Esparguete Bolonhesa","Tiramisu"]',                                            'In Preparation', '2026-05-30 12:49:00'),
-- #1033 · Joana Luz · Mesa 22 · PRONTO
( 3, 22, 'Table',    NULL, '["Chicken Wings","Coca-Cola"]',                                                  'Ready',          '2026-05-30 12:38:00'),
-- #1034 · Bruno Costa · Mesa 21 · NOVO
( 4, 21, 'Table',    NULL, '["Creme Soup","Vegetarian Pasta","Cheesecake"]',                                 'Pending',        '2026-05-30 12:50:00'),
-- #1035 · Igor Lima · Mesa 23 · EM PREPARAÇÃO
( 5, 23, 'Table',    NULL, '["Chicken Parmigiana","Craft Beer","Tiramisu"]',                                 'In Preparation', '2026-05-30 12:51:00');

-- =========================================================================
-- 10. ORDER ITEMS (itens de cada pedido)
-- =========================================================================

INSERT INTO order_items (order_id, item_id, quantity) VALUES
-- #1023 · Grilled Salmon, Legumes Salteados, Sparkling Water
(1023,  7, 1), (1023, 24, 1), (1023, 16, 1),
-- #1024 · Frango Assado, Craft Beer
(1024, 23, 1), (1024, 14, 1),
-- #1025 · Bruschetta, Sumol, Esparguete Bolonhesa, Caesar Salad, Chocolate Mousse
(1025,  3, 1), (1025, 26, 1), (1025,  1, 1), (1025,  4, 1), (1025, 10, 1),
-- #1026 · Hamburguer Gourmet, Batatas Fritas, Sparkling Water
(1026,  2, 1), (1026, 19, 1), (1026, 16, 1),
-- #1027 · Bruschetta, Sumol
(1027,  3, 1), (1027, 26, 1),
-- #1028 · Bife à Casa, Arroz de Marisco, Batatas Fritas, Coca-Cola
(1028, 17, 1), (1028, 18, 1), (1028, 19, 1), (1028, 25, 1),
-- #1029 · Pizza Margherita, Sumol
(1029, 20, 1), (1029, 26, 1),
-- #1030 · Bacalhau à Brás, Salada Mista, Red Wine Glass, Pão, Café
(1030, 21, 1), (1030, 22, 1), (1030, 15, 1), (1030, 28, 1), (1030, 27, 1),
-- #1031 · Caesar Salad, Grilled Salmon, Orange Juice
(1031,  4, 1), (1031,  7, 1), (1031, 13, 1),
-- #1032 · Esparguete Bolonhesa, Tiramisu
(1032,  1, 1), (1032, 11, 1),
-- #1033 · Chicken Wings, Coca-Cola
(1033,  5, 1), (1033, 25, 1),
-- #1034 · Creme Soup, Vegetarian Pasta, Cheesecake
(1034,  6, 1), (1034,  9, 1), (1034, 12, 1),
-- #1035 · Chicken Parmigiana, Craft Beer, Tiramisu
(1035,  8, 1), (1035, 14, 1), (1035, 11, 1);
