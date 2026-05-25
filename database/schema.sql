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
    order_status ENUM('Pending in Kitchen', 'N/A') DEFAULT 'Pending in Kitchen',
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
('T06', 6, 'Available'),   -- id 6  · Mesa média
('T07', 8, 'Available'),   -- id 7  · Mesa grande
('T08', 8, 'Available'),   -- id 8  · Mesa grande
('T09', 2, 'Available'),   -- id 9  · Mesa pequena (esplanada)
('T10', 10, 'Available');  -- id 10 · Mesa de grupo / eventos

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
