-- ══════════════════════════════════════════════════════
-- PostgreSQL Schema Initialization
-- ══════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────
-- PAYMENT CONTEXT
-- ──────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS payment;

-- Tabla:  payments (Aggregate Root)
CREATE TABLE IF NOT EXISTS payment. payments (
    id                      UUID PRIMARY KEY,
    order_id                UUID NOT NULL,
    
    -- Money (Value Object)
    amount                  DECIMAL(19, 4) NOT NULL,
    currency                VARCHAR(3) NOT NULL,
    
    -- Status
    status                  VARCHAR(50) NOT NULL,
    
    -- Payment Method (Value Object serializado)
    method_type             VARCHAR(50) NOT NULL,
    method_details          JSONB,
    
    -- External gateway reference
    stripe_payment_intent_id VARCHAR(255),
    
    -- Timestamps
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    authorized_at           TIMESTAMP,
    captured_at             TIMESTAMP,
    
    -- Optimistic locking
    version                 INTEGER NOT NULL DEFAULT 0,
    
    -- Constraints
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_valid_currency CHECK (currency IN ('USD', 'MXN', 'EUR', 'GBP')),
    CONSTRAINT chk_valid_status CHECK (status IN (
        'pending', 'authorized', 'captured', 
        'partially_refunded', 'refunded', 'failed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payment.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payment.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payment.payments(created_at DESC);

-- Tabla: payment_transactions (Entidad interna)
CREATE TABLE IF NOT EXISTS payment. payment_transactions (
    id                      UUID PRIMARY KEY,
    payment_id              UUID NOT NULL REFERENCES payment.payments(id) ON DELETE CASCADE,
    
    type                    VARCHAR(50) NOT NULL,
    
    amount                  DECIMAL(19, 4) NOT NULL,
    currency                VARCHAR(3) NOT NULL,
    
    authorization_code      VARCHAR(255),
    reason                  TEXT,
    
    timestamp               TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_transaction_type CHECK (type IN ('authorization', 'capture', 'refund'))
);

CREATE INDEX IF NOT EXISTS idx_transactions_payment_id ON payment. payment_transactions(payment_id);

-- ──────────────────────────────────────────────────────
-- ORDERS CONTEXT
-- ──────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS orders;

-- Tabla: orders (Aggregate Root)
CREATE TABLE IF NOT EXISTS orders.orders (
    id                      UUID PRIMARY KEY,
    customer_id             UUID NOT NULL,
    
    status                  VARCHAR(50) NOT NULL,
    
    total_amount            DECIMAL(19, 4) NOT NULL,
    total_currency          VARCHAR(3) NOT NULL,
    
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at            TIMESTAMP,
    cancelled_at            TIMESTAMP,
    cancellation_reason     TEXT,
    
    version                 INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT chk_order_status CHECK (status IN (
        'draft', 'confirmed', 'cancelled', 'completed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders.orders(created_at DESC);

-- Tabla: order_items (Entidad interna)
CREATE TABLE IF NOT EXISTS orders.order_items (
    id                      UUID PRIMARY KEY,
    order_id                UUID NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    product_id              UUID NOT NULL,
    
    quantity                INTEGER NOT NULL,
    
    price_amount            DECIMAL(19, 4) NOT NULL,
    price_currency          VARCHAR(3) NOT NULL,
    
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0),
    CONSTRAINT chk_price_positive CHECK (price_amount > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON orders.order_items(order_id);

-- ──────────────────────────────────────────────────────
-- INVENTORY CONTEXT
-- ──────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS inventory;

-- Tabla: stock_items (Aggregate Root)
CREATE TABLE IF NOT EXISTS inventory.stock_items (
    id                      UUID PRIMARY KEY,
    product_id              UUID UNIQUE NOT NULL,
    
    available_quantity      INTEGER NOT NULL DEFAULT 0,
    reserved_quantity       INTEGER NOT NULL DEFAULT 0,
    
    version                 INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT chk_available_positive CHECK (available_quantity >= 0),
    CONSTRAINT chk_reserved_positive CHECK (reserved_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_product_id ON inventory.stock_items(product_id);

-- Tabla: reservations (Entidad interna)
CREATE TABLE IF NOT EXISTS inventory. reservations (
    id                      UUID PRIMARY KEY,
    stock_item_id           UUID NOT NULL REFERENCES inventory.stock_items(id) ON DELETE CASCADE,
    order_id                UUID NOT NULL,
    
    quantity                INTEGER NOT NULL,
    
    reserved_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMP NOT NULL,
    released_at             TIMESTAMP,
    
    status                  VARCHAR(50) NOT NULL,
    
    CONSTRAINT chk_reservation_status CHECK (status IN ('active', 'released', 'confirmed')),
    CONSTRAINT chk_reservation_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_reservations_order_id ON inventory.reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON inventory.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON inventory.reservations(expires_at) 
    WHERE status = 'active';

-- ──────────────────────────────────────────────────────
-- SAGAS (Para Order Process Manager)
-- ──────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS sagas;

-- Tabla: order_process_sagas (Saga state persistence)
CREATE TABLE IF NOT EXISTS sagas.order_process_sagas (
    id                      UUID PRIMARY KEY,
    order_id                UUID UNIQUE NOT NULL,
    
    current_step            VARCHAR(100) NOT NULL,
    status                  VARCHAR(50) NOT NULL,
    
    -- Data snapshot (para recovery)
    data                    JSONB NOT NULL,
    
    created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMP,
    
    version                 INTEGER NOT NULL DEFAULT 0,
    
    CONSTRAINT chk_saga_status CHECK (status IN (
        'started', 'inventory_reserved', 'payment_authorized', 
        'order_confirmed', 'completed', 'compensating', 'compensated', 'failed'
    ))
);

CREATE INDEX IF NOT EXISTS idx_sagas_order_id ON sagas.order_process_sagas(order_id);
CREATE INDEX IF NOT EXISTS idx_sagas_status ON sagas.order_process_sagas(status);

-- ══════════════════════════════════════════════════════
-- Seed data (productos de ejemplo para testing)
-- ══════════════════════════════════════════════════════

INSERT INTO inventory. stock_items (id, product_id, available_quantity, reserved_quantity)
VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '123e4567-e89b-12d3-a456-426614174001', 100, 0),
    ('550e8400-e29b-41d4-a716-446655440002', '123e4567-e89b-12d3-a456-426614174002', 50, 0),
    ('550e8400-e29b-41d4-a716-446655440003', '123e4567-e89b-12d3-a456-426614174003', 200, 0)
ON CONFLICT (product_id) DO NOTHING;