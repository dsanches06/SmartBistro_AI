-- PostgreSQL / Neon schema for SmartBistro
-- customers → users + nova tabela staff + user_id → user_id

-- Drop existing objects
DROP TABLE IF EXISTS points_transactions CASCADE;
DROP TABLE IF EXISTS user_points CASCADE;
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS recipe_items CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS reservations CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS auth_accounts CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS item_category CASCADE;
DROP TYPE IF EXISTS reservation_status CASCADE;
DROP TYPE IF EXISTS table_status CASCADE;

CREATE TYPE table_status AS ENUM ('Available', 'Occupied', 'Reserved');
CREATE TYPE reservation_status AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'Completed');
CREATE TYPE item_category AS ENUM ('Appetizer', 'Main Course', 'Dessert', 'Beverage');
CREATE TYPE service_type AS ENUM ('Table', 'Takeaway');
CREATE TYPE order_status AS ENUM ('Pending', 'In Preparation', 'Ready', 'Done', 'Delivered', 'Cancelled');
CREATE TYPE payment_method AS ENUM ('MB Way', 'Multibanco', 'Credit Card', 'Cash');
CREATE TYPE payment_status AS ENUM ('Pending', 'Completed', 'Failed');

-- 1. Funções do Sistema
CREATE TABLE roles (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE,
    flow_order INTEGER
);

-- 2. Tabela Geral de Utilizadores (substitui 'customers')
CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    active BOOLEAN DEFAULT FALSE,
    role_id INTEGER NOT NULL DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- 3. Staff (subtipo de users)
CREATE TABLE staff (
    user_id INTEGER NOT NULL,
    employee_number VARCHAR(20) GENERATED ALWAYS AS ('EMP-' || user_id::text) STORED,
    hire_date DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4. Credenciais de Autenticação
CREATE TABLE auth_accounts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 5. Sessões de Chat
CREATE TABLE conversations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- 6. Histórico de Mensagens
CREATE TABLE chat_history (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles (id)
);

-- 7. Notificações
CREATE TABLE notification (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 8. Mesas
CREATE TABLE tables (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_number VARCHAR(50) NOT NULL UNIQUE,
    capacity INTEGER DEFAULT 4,
    status table_status DEFAULT 'Available'
);

-- 9. Reservas
CREATE TABLE reservations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER,
    table_id INTEGER,
    reservation_date TIMESTAMP WITH TIME ZONE NOT NULL,
    party_size INTEGER DEFAULT 1,
    status reservation_status DEFAULT 'Pending',
    phone VARCHAR(20) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);

-- 10. Itens do Menu
CREATE TABLE items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category item_category NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 11. Ingredientes
CREATE TABLE ingredients (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    measurement_unit VARCHAR(20) NOT NULL
);

-- 12. Stock
CREATE TABLE stock (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ingredient_id INTEGER NOT NULL UNIQUE,
    available_quantity NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit_cost NUMERIC(10,4) NOT NULL DEFAULT 0.0000,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- 13. Ficha Técnica / Receita
CREATE TABLE recipe_items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    item_id INTEGER NOT NULL,
    ingredient_id INTEGER NOT NULL,
    required_quantity NUMERIC(10,2) NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- 14. Pedidos
CREATE TABLE orders (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER,
    table_id INTEGER,
    service_type service_type NOT NULL,
    allergy_restrictions TEXT,
    kitchen_sequence_json JSONB NOT NULL,
    order_status order_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL
);

-- 15. Itens do Pedido
CREATE TABLE order_items (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);

-- 16. Faturas
CREATE TABLE invoices (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER NOT NULL UNIQUE,
    subtotal_amount NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    profit_margin NUMERIC(10,2) NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 17. Pagamentos
CREATE TABLE payments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER,
    amount NUMERIC(10,2) NOT NULL,
    payment_method payment_method DEFAULT 'MB Way',
    payment_status payment_status DEFAULT 'Pending',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 18. Logs
CREATE TABLE logs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id INTEGER,
    agent_name VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    input_payload JSONB,
    output_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Programa de pontos — saldo por utilizador (1€ pago = 1 ponto)
CREATE TABLE user_points (
    id             INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        INTEGER NOT NULL UNIQUE,
    balance        INTEGER DEFAULT 0,
    total_earned   INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Histórico de transações de pontos
CREATE TABLE points_transactions (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    amount      INTEGER NOT NULL,
    description VARCHAR(200),
    order_id    INTEGER,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_updated_at
BEFORE UPDATE ON reservations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER stock_updated_at
BEFORE UPDATE ON stock
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_points_updated_at
BEFORE UPDATE ON user_points
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
