-- Module Facade Rover (MFR) — Milestone M7 PostgreSQL Relational Schema
-- Strictly enforces telemetry source segregation, advisory-only CV detections,
-- and hard hardware safety isolation (zero AI actuator / E-stop override fields).

CREATE TABLE IF NOT EXISTS robots (
    id SERIAL PRIMARY KEY,
    robot_code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('IN_DEVELOPMENT', 'BENCH_TESTING', 'OFFLINE', 'SIMULATED_ONLY')),
    cad_length_mm DOUBLE PRECISION NOT NULL CHECK (cad_length_mm > 0),
    cad_width_mm DOUBLE PRECISION NOT NULL CHECK (cad_width_mm > 0),
    cad_height_mm DOUBLE PRECISION NOT NULL CHECK (cad_height_mm > 0),
    wheelbase_mm DOUBLE PRECISION NOT NULL CHECK (wheelbase_mm > 0),
    vertical_glass_certified BOOLEAN NOT NULL DEFAULT FALSE CHECK (vertical_glass_certified = FALSE),
    ai_safety_control_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (ai_safety_control_enabled = FALSE),
    estop_override_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (estop_override_allowed = FALSE),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_registry (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(128) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    model_tier VARCHAR(64) NOT NULL CHECK (model_tier IN ('SMOKE_TEST_FIXTURE_ONLY', 'REAL_FACADE_VERIFIED')),
    real_dataset_trained BOOLEAN NOT NULL DEFAULT FALSE,
    is_real_facade_evaluated BOOLEAN NOT NULL DEFAULT FALSE,
    weights_sha256 VARCHAR(64) NOT NULL,
    advisory_only BOOLEAN NOT NULL DEFAULT TRUE CHECK (advisory_only = TRUE),
    safety_actuation_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (safety_actuation_allowed = FALSE),
    disclaimer TEXT NOT NULL,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (model_name, model_version)
);

CREATE TABLE IF NOT EXISTS inspections (
    id SERIAL PRIMARY KEY,
    robot_id INTEGER NOT NULL REFERENCES robots(id) ON DELETE RESTRICT,
    model_id INTEGER NOT NULL REFERENCES model_registry(id) ON DELETE RESTRICT,
    source_type VARCHAR(64) NOT NULL CHECK (source_type IN ('UPLOAD', 'SMOKE_FIXTURE', 'UNLABELED_CURTAINWALL_AUDIT', 'WORKSPACE_PATH')),
    source_name VARCHAR(255) NOT NULL,
    input_sha256 VARCHAR(64) NOT NULL,
    image_width INTEGER NOT NULL CHECK (image_width > 0),
    image_height INTEGER NOT NULL CHECK (image_height > 0),
    inference_ms DOUBLE PRECISION NOT NULL CHECK (inference_ms >= 0.0),
    model_tier VARCHAR(64) NOT NULL,
    real_dataset_trained BOOLEAN NOT NULL DEFAULT FALSE,
    advisory_only BOOLEAN NOT NULL DEFAULT TRUE CHECK (advisory_only = TRUE),
    safety_actuation_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (safety_actuation_allowed = FALSE),
    disclaimer TEXT NOT NULL,
    class_probabilities_json TEXT NOT NULL,
    operator_review_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_HUMAN_REVIEW' CHECK (operator_review_status IN ('PENDING_HUMAN_REVIEW', 'CONFIRMED', 'DISMISSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS defect_detections (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL CHECK (class_id BETWEEN 0 AND 4),
    class_name VARCHAR(64) NOT NULL CHECK (class_name IN ('Crack', 'Sealant deterioration', 'Rust / corrosion', 'Water stain', 'Normal surface')),
    confidence DOUBLE PRECISION NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    bbox_cx DOUBLE PRECISION NOT NULL CHECK (bbox_cx >= 0.0 AND bbox_cx <= 1.0),
    bbox_cy DOUBLE PRECISION NOT NULL CHECK (bbox_cy >= 0.0 AND bbox_cy <= 1.0),
    bbox_w DOUBLE PRECISION NOT NULL CHECK (bbox_w >= 0.0 AND bbox_w <= 1.0),
    bbox_h DOUBLE PRECISION NOT NULL CHECK (bbox_h >= 0.0 AND bbox_h <= 1.0),
    advisory_only BOOLEAN NOT NULL DEFAULT TRUE CHECK (advisory_only = TRUE)
);

CREATE TABLE IF NOT EXISTS telemetry_logs (
    id SERIAL PRIMARY KEY,
    robot_id INTEGER NOT NULL REFERENCES robots(id) ON DELETE RESTRICT,
    telemetry_source VARCHAR(32) NOT NULL CHECK (telemetry_source IN ('SIMULATED_MOCK', 'LIVE_BENCH', 'UNCONNECTED')),
    system_state VARCHAR(32) NOT NULL CHECK (system_state IN ('NORMAL', 'CAMERA_DISCONNECTED', 'COMMUNICATION_FAILURE', 'SENSOR_FAILURE', 'MOTOR_FAULT', 'E_STOP', 'UNCONNECTED')),
    surface_mode VARCHAR(32) NOT NULL DEFAULT 'HORIZONTAL_GROUND_ONLY' CHECK (surface_mode IN ('HORIZONTAL_GROUND_ONLY', 'BENCH_RIG_NO_LOAD')),
    battery_voltage_v DOUBLE PRECISION,
    wheel_rpm_avg DOUBLE PRECISION,
    wifi_rssi_dbm INTEGER,
    camera_link_ok BOOLEAN NOT NULL DEFAULT FALSE,
    hardware_estop_engaged BOOLEAN NOT NULL DEFAULT TRUE,
    ai_safety_control_enabled BOOLEAN NOT NULL DEFAULT FALSE CHECK (ai_safety_control_enabled = FALSE),
    estop_override_allowed BOOLEAN NOT NULL DEFAULT FALSE CHECK (estop_override_allowed = FALSE),
    note TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS safety_events (
    id SERIAL PRIMARY KEY,
    robot_id INTEGER NOT NULL REFERENCES robots(id) ON DELETE RESTRICT,
    event_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL', 'BLOCKED_403')),
    source_component VARCHAR(64) NOT NULL,
    blocked_by_policy BOOLEAN NOT NULL DEFAULT FALSE,
    hardware_estop_independent BOOLEAN NOT NULL DEFAULT TRUE CHECK (hardware_estop_independent = TRUE),
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inspections_robot_created ON inspections (robot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_defect_detections_inspection ON defect_detections (inspection_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_robot_recorded ON telemetry_logs (robot_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_source ON telemetry_logs (telemetry_source);
CREATE INDEX IF NOT EXISTS idx_safety_events_created ON safety_events (created_at DESC);
