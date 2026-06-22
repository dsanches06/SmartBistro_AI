DROP DATABASE IF EXISTS smartbistro;
CREATE DATABASE smartbistro;
USE smartbistro;

/* =========================================================================
   1. TABELAS DE UTILIZADORES, CHAT E INFRAESTRUTURA
   ========================================================================= */

-- 1. Funções do Sistema
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(20) NOT NULL UNIQUE,
    flow_order INT
);

-- 2. Tabela Geral de Utilizadores (substitui 'customers')
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) NULL UNIQUE,
    phone VARCHAR(20) NULL UNIQUE,
    active BOOLEAN DEFAULT FALSE,
    role_id INT NOT NULL DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- 3. Staff (subtipo de users com dados específicos de funcionário)
CREATE TABLE staff (
    user_id INT NOT NULL,
    employee_number VARCHAR(20) GENERATED ALWAYS AS (CONCAT('EMP-', user_id)) VIRTUAL,
    hire_date DATE DEFAULT (CURRENT_DATE()),
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4. Credenciais de Autenticação (serve para qualquer user)
CREATE TABLE auth_accounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 5. Sessões de Chat
CREATE TABLE conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- 6. Histórico de Mensagens
CREATE TABLE chat_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    role_id INT NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- 7. Notificações
CREATE TABLE notification (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 8. Mesas
CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(50) NOT NULL UNIQUE,
    capacity INT DEFAULT 4,
    status ENUM('Available', 'Occupied', 'Reserved') DEFAULT 'Available'
);

-- 9. Reservas
CREATE TABLE reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    table_id INT NULL,
    reservation_date DATETIME NOT NULL,
    party_size INT DEFAULT 1,
    status ENUM('Pending', 'Confirmed', 'Cancelled', 'Completed') DEFAULT 'Pending',
    phone VARCHAR(20) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);

/* =========================================================================
   2. TABELAS DE PRODUTOS, INVENTÁRIO E FICHA TÉCNICA
   ========================================================================= */

-- Itens do Menu
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
   3. TABELAS DE MOVIMENTAÇÃO, FATURAÇÃO, LOGS E PAGAMENTOS
   ========================================================================= */

-- Pedidos (Orders - KDS)
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    table_id INT NULL,
    service_type ENUM('Table', 'Takeaway') NOT NULL,
    allergy_restrictions TEXT,
    kitchen_sequence_json JSON NOT NULL,
    order_status ENUM('Pending','In Preparation','Ready','Done','Delivered','Cancelled') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
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

-- Faturas
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

-- Pagamentos
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL UNIQUE,
    user_id INT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('MB Way', 'Multibanco', 'Credit Card', 'Cash') DEFAULT 'MB Way',
    payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    processed_at DATETIME NULL DEFAULT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
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

-- Programa de pontos — saldo por utilizador (1€ pago = 1 ponto)
CREATE TABLE user_points (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    user_id        INT NOT NULL UNIQUE,
    balance        INT DEFAULT 0,
    total_earned   INT DEFAULT 0,
    total_redeemed INT DEFAULT 0,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Histórico de transações de pontos
CREATE TABLE points_transactions (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    user_id     INT NOT NULL,
    amount      INT NOT NULL,
    description VARCHAR(200),
    order_id    INT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Previsões semanais de receitas (geradas manualmente pelo staff)
CREATE TABLE weekly_forecast (
    id               INT PRIMARY KEY AUTO_INCREMENT,
    week_start       DATE NOT NULL,
    week_end         DATE NOT NULL,
    predicted_total  DECIMAL(10,2) NOT NULL,
    actual_total     DECIMAL(10,2) DEFAULT NULL,
    trend            VARCHAR(20) DEFAULT 'estável',
    summary               TEXT,
    forecast_daily_json   TEXT DEFAULT NULL,
    generated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_week (week_start)
);
