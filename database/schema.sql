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
    gender ENUM('Masculino', 'Feminino', 'Outro', 'Não informado') DEFAULT 'Não informado',
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
    table_id INT NULL,
    service_type VARCHAR(50) NOT NULL, -- Table ou Takeaway
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

INSERT INTO customers (id, name, email, phone, gender, role_id) VALUES
(1, 'Hugo Neto', 'hugo@dev.com', '555-0108', 'Masculino', 2),
(2, 'Ana Silva', 'ana@dev.com', '555-0101', 'Feminino', 2), 
(3, 'Joana Luz', 'joana@dev.com', '555-0110', 'Feminino', 2),
(4, 'Bruno Costa', 'bruno@dev.com', '555-0102', 'Masculino', 2),
(5, 'Igor Lima', 'igor@dev.com', '555-0109', 'Masculino', 2),
(6, 'Carla Dias', 'carla@dev.com', '555-0103', 'Feminino',2),
(7, 'Filipe Gil', 'filipe@dev.com', '555-0106', 'Masculino', 2),
(8, 'Elena Vaz', 'elena@dev.com', '555-0105', 'Feminino', 2), 
(9, 'David Reas', 'david@dev.com', '555-0104', 'Masculino', 2),
(10, 'Gina Rosa', 'gina@dev.com', '555-0107', 'Feminino', 2);

INSERT INTO ingredients (name, measurement_unit) VALUES 
('Long Italian Pasta', 'kg'), ('Minced Beef Meat', 'kg'), ('Brioche Burger Bun', 'units');

INSERT INTO stock (ingredient_id, available_quantity, unit_cost) VALUES 
(1, 20.00, 1.5000), (2, 15.00, 7.5000), (3, 50.00, 0.4000);

INSERT INTO items (name, category, price) VALUES 
('Esparguete Bolonhesa', 'Main Course', 12.50), 
('Hamburguer Gourmet', 'Main Course', 14.00);

INSERT INTO recipe_items (item_id, ingredient_id, required_quantity) VALUES 
(1, 1, 0.12), (1, 2, 0.15), (2, 3, 1.00), (2, 2, 0.18);
