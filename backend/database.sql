-- ============================================================
-- Glory Simon Interiors - Site Visit Booking System
-- Complete MySQL Database Schema
-- Version: 1.0.0
-- 
-- Run this file to create the full database schema:
--   mysql -u root -p < database.sql
-- ============================================================



-- ─────────────────────────────────────────────────────────────
-- TABLE 1: roles
-- Defines available system roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50)      NOT NULL,
  created_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed the four roles immediately
INSERT IGNORE INTO roles (id, name) VALUES
  (1, 'Admin'),
  (2, 'Client'),
  (3, 'Designer'),
  (4, 'Site Engineer');

-- ─────────────────────────────────────────────────────────────
-- TABLE 2: users
-- Central authentication table shared across all roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  email         VARCHAR(180)     NOT NULL,
  password_hash VARCHAR(255)     NOT NULL,
  role_id       TINYINT UNSIGNED NOT NULL,
  full_name     VARCHAR(150)     NOT NULL,
  mobile_number VARCHAR(15)      NOT NULL,
  is_active     TINYINT(1)       NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP        NULL     DEFAULT NULL,
  created_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role_id   (role_id),
  INDEX idx_users_mobile    (mobile_number),
  INDEX idx_users_is_active (is_active),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id)
    REFERENCES roles (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 3: clients
-- Extended profile for Client role users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  address       TEXT         NULL,
  city          VARCHAR(100) NULL,
  pincode       VARCHAR(10)  NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clients_user_id (user_id),
  INDEX idx_clients_city    (city),
  INDEX idx_clients_pincode (pincode),
  CONSTRAINT fk_clients_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 4: designers
-- Extended profile for Interior Designer role users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS designers (
  id             INT UNSIGNED                NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED                NOT NULL,
  specialization VARCHAR(150)                NULL,
  experience_yrs TINYINT UNSIGNED            NOT NULL DEFAULT 0,
  status         ENUM('Active', 'Inactive')  NOT NULL DEFAULT 'Active',
  created_at     TIMESTAMP                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_designers_user_id (user_id),
  INDEX idx_designers_status (status),
  CONSTRAINT fk_designers_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 5: site_engineers
-- Extended profile for Site Engineer role users
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_engineers (
  id             INT UNSIGNED               NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED               NOT NULL,
  specialization VARCHAR(150)               NULL,
  experience_yrs TINYINT UNSIGNED           NOT NULL DEFAULT 0,
  status         ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  created_at     TIMESTAMP                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP                  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_engineers_user_id (user_id),
  INDEX idx_engineers_status (status),
  CONSTRAINT fk_engineers_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 6: project_types
-- Lookup table for interior design project categories
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_types (
  id          TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100)     NOT NULL,
  description TEXT             NULL,
  is_active   TINYINT(1)       NOT NULL DEFAULT 1,
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_types_name (name),
  INDEX idx_project_types_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed project types
INSERT IGNORE INTO project_types (id, name, description) VALUES
  (1,  'Full Home Interior',        'Complete interior design for all rooms'),
  (2,  'Modular Kitchen',           'Modern modular kitchen design and installation'),
  (3,  'Living Room',               'Living room interior design and decor'),
  (4,  'Bedroom',                   'Bedroom interior design with wardrobes'),
  (5,  'Bathroom & Toilet',         'Bathroom renovation and interior'),
  (6,  'Home Office',               'Office setup and interior design'),
  (7,  'Commercial Office',         'Corporate office interior design'),
  (8,  'Retail Showroom',           'Retail space design and branding'),
  (9,  'Restaurant & Cafe',         'Hospitality venue interior design'),
  (10, 'False Ceiling & Lighting',  'False ceiling, cove lighting installation');

-- ─────────────────────────────────────────────────────────────
-- TABLE 7: slots
-- Admin-managed time slots for site visits per date
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS slots (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slot_date        DATE         NOT NULL,
  start_time       TIME         NOT NULL,
  end_time         TIME         NOT NULL,
  max_bookings     TINYINT UNSIGNED NOT NULL DEFAULT 3,
  current_bookings TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_active        TINYINT(1)       NOT NULL DEFAULT 1,
  created_by       INT UNSIGNED     NOT NULL,
  created_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_slots_date_time (slot_date, start_time, end_time),
  INDEX idx_slots_date      (slot_date),
  INDEX idx_slots_active    (is_active),
  INDEX idx_slots_available (slot_date, is_active, current_bookings),
  CONSTRAINT fk_slots_created_by FOREIGN KEY (created_by)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_slots_time CHECK (end_time > start_time),
  CONSTRAINT chk_slots_bookings CHECK (current_bookings <= max_bookings)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 8: bookings
-- Core booking record — heart of the system
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_ref         VARCHAR(20)  NOT NULL,
  client_id           INT UNSIGNED NOT NULL,
  property_type       ENUM('Residential', 'Commercial') NOT NULL,
  project_type_id     TINYINT UNSIGNED NOT NULL,
  address             TEXT         NOT NULL,
  city                VARCHAR(100) NOT NULL,
  pincode             VARCHAR(10)  NOT NULL,
  preferred_visit_date DATE         NOT NULL,
  slot_id             INT UNSIGNED NOT NULL,
  num_rooms           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  estimated_budget    DECIMAL(12, 2)   NOT NULL DEFAULT 0.00,
  project_description TEXT         NULL,
  status              ENUM(
    'Pending',
    'Confirmed',
    'Assigned',
    'Scheduled',
    'In Progress',
    'Completed',
    'Cancelled'
  ) NOT NULL DEFAULT 'Pending',
  priority            ENUM('Low', 'Medium', 'High', 'Urgent') NOT NULL DEFAULT 'Medium',
  cancellation_reason TEXT         NULL,
  confirmed_at        TIMESTAMP    NULL DEFAULT NULL,
  completed_at        TIMESTAMP    NULL DEFAULT NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_bookings_ref (booking_ref),
  INDEX idx_bookings_client_id        (client_id),
  INDEX idx_bookings_slot_id          (slot_id),
  INDEX idx_bookings_project_type     (project_type_id),
  INDEX idx_bookings_status           (status),
  INDEX idx_bookings_priority         (priority),
  INDEX idx_bookings_visit_date       (preferred_visit_date),
  INDEX idx_bookings_city             (city),
  INDEX idx_bookings_status_date      (status, preferred_visit_date),
  CONSTRAINT fk_bookings_client       FOREIGN KEY (client_id)
    REFERENCES clients (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_slot         FOREIGN KEY (slot_id)
    REFERENCES slots (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_project_type FOREIGN KEY (project_type_id)
    REFERENCES project_types (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 9: assignments
-- Links bookings to assigned staff (designer and/or engineer)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assignments (
  id                  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id          INT UNSIGNED NOT NULL,
  staff_role          ENUM('Designer', 'Site Engineer') NOT NULL,
  staff_user_id       INT UNSIGNED NOT NULL,
  assigned_by_user_id INT UNSIGNED NOT NULL,
  assignment_date     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status              ENUM('Active', 'Reassigned', 'Completed') NOT NULL DEFAULT 'Active',
  notes               TEXT         NULL,
  created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_assignments_booking_id     (booking_id),
  INDEX idx_assignments_staff_user_id  (staff_user_id),
  INDEX idx_assignments_status         (status),
  INDEX idx_assignments_role           (staff_role),
  CONSTRAINT fk_assignments_booking    FOREIGN KEY (booking_id)
    REFERENCES bookings (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_assignments_staff      FOREIGN KEY (staff_user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_assignments_assigned_by FOREIGN KEY (assigned_by_user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 10: visit_reports
-- Post-visit documentation submitted by designer or engineer
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visit_reports (
  id                   INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  booking_id           INT UNSIGNED   NOT NULL,
  submitted_by_user_id INT UNSIGNED   NOT NULL,
  visit_date           DATE           NOT NULL,
  observations         TEXT           NULL,
  design_suggestions   TEXT           NULL,
  material_suggestions TEXT           NULL,
  budget_estimate      DECIMAL(12, 2) NULL,
  summary              TEXT           NULL,
  follow_up_notes      TEXT           NULL,
  is_pdf_generated     TINYINT(1)     NOT NULL DEFAULT 0,
  pdf_path             VARCHAR(255)   NULL,
  created_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_visit_reports_booking (booking_id),
  INDEX idx_visit_reports_submitted_by (submitted_by_user_id),
  INDEX idx_visit_reports_visit_date   (visit_date),
  CONSTRAINT fk_visit_reports_booking  FOREIGN KEY (booking_id)
    REFERENCES bookings (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_visit_reports_user     FOREIGN KEY (submitted_by_user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 11: measurements
-- Per-room dimension records linked to visit report
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS measurements (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  visit_report_id INT UNSIGNED   NOT NULL,
  room_name       VARCHAR(100)   NOT NULL,
  length_ft       DECIMAL(8, 2)  NOT NULL DEFAULT 0.00,
  width_ft        DECIMAL(8, 2)  NOT NULL DEFAULT 0.00,
  height_ft       DECIMAL(8, 2)  NOT NULL DEFAULT 0.00,
  area_sqft       DECIMAL(10, 2) GENERATED ALWAYS AS (length_ft * width_ft) STORED,
  notes           TEXT           NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_measurements_report (visit_report_id),
  CONSTRAINT fk_measurements_report FOREIGN KEY (visit_report_id)
    REFERENCES visit_reports (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 12: site_photos
-- Photos uploaded during or after site visit
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_photos (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  visit_report_id INT UNSIGNED NOT NULL,
  photo_filename  VARCHAR(255) NOT NULL,
  photo_url       VARCHAR(500) NOT NULL,
  photo_description TEXT       NULL,
  file_size_kb    INT UNSIGNED NULL,
  uploaded_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_site_photos_report (visit_report_id),
  CONSTRAINT fk_site_photos_report FOREIGN KEY (visit_report_id)
    REFERENCES visit_reports (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 13: notifications
-- Stores all system notifications: Email, WhatsApp, In-App
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  booking_id INT UNSIGNED NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  type       ENUM('Email', 'WhatsApp', 'In-App') NOT NULL,
  status     ENUM('Pending', 'Sent', 'Failed', 'Read') NOT NULL DEFAULT 'Pending',
  is_read    TINYINT(1)   NOT NULL DEFAULT 0,
  sent_at    TIMESTAMP    NULL DEFAULT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_notifications_user_id   (user_id),
  INDEX idx_notifications_booking_id (booking_id),
  INDEX idx_notifications_type      (type),
  INDEX idx_notifications_status    (status),
  INDEX idx_notifications_unread    (user_id, is_read),
  CONSTRAINT fk_notifications_user    FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id)
    REFERENCES bookings (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 14: activity_logs
-- Audit trail for all significant system actions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50)  NULL,
  entity_id   INT UNSIGNED NULL,
  details     JSON         NULL,
  ip_address  VARCHAR(45)  NULL,
  user_agent  TEXT         NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_activity_logs_user_id     (user_id),
  INDEX idx_activity_logs_action      (action),
  INDEX idx_activity_logs_entity      (entity_type, entity_id),
  INDEX idx_activity_logs_created_at  (created_at),
  CONSTRAINT fk_activity_logs_user    FOREIGN KEY (user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 15: followups
-- Scheduled follow-up actions per booking
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id                   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id           INT UNSIGNED NOT NULL,
  scheduled_by_user_id INT UNSIGNED NOT NULL,
  follow_up_date       DATE         NOT NULL,
  notes                TEXT         NULL,
  status               ENUM('Pending', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Pending',
  completed_at         TIMESTAMP    NULL DEFAULT NULL,
  created_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_followups_booking_id  (booking_id),
  INDEX idx_followups_date        (follow_up_date),
  INDEX idx_followups_status      (status),
  CONSTRAINT fk_followups_booking FOREIGN KEY (booking_id)
    REFERENCES bookings (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_followups_user    FOREIGN KEY (scheduled_by_user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TABLE 16: quotations
-- Quotation records generated after site visit
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quotations (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  booking_id      INT UNSIGNED   NOT NULL,
  created_by_user_id INT UNSIGNED NOT NULL,
  quotation_ref   VARCHAR(20)    NOT NULL,
  item_details    JSON           NOT NULL,
  subtotal        DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_percent     DECIMAL(5, 2)  NOT NULL DEFAULT 18.00,
  tax_amount      DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount    DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  status          ENUM('Draft', 'Sent', 'Approved', 'Rejected', 'Revised') NOT NULL DEFAULT 'Draft',
  valid_until     DATE           NULL,
  notes           TEXT           NULL,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_quotations_ref (quotation_ref),
  INDEX idx_quotations_booking_id (booking_id),
  INDEX idx_quotations_status     (status),
  CONSTRAINT fk_quotations_booking  FOREIGN KEY (booking_id)
    REFERENCES bookings (id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_quotations_user     FOREIGN KEY (created_by_user_id)
    REFERENCES users (id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_bookings_before_insert;
DROP TRIGGER IF EXISTS trg_quotations_before_insert;
DROP TRIGGER IF EXISTS trg_bookings_after_insert;
DROP TRIGGER IF EXISTS trg_bookings_after_status_update;

DELIMITER $$

-- Auto-generate booking reference (GSI-YYYYMMDD-XXXX)
CREATE TRIGGER trg_bookings_before_insert
BEFORE INSERT ON bookings
FOR EACH ROW
BEGIN
  IF NEW.booking_ref IS NULL OR NEW.booking_ref = '' THEN
    SET NEW.booking_ref = CONCAT(
      'GSI-',
      DATE_FORMAT(NOW(), '%Y%m%d'),
      '-',
      LPAD(FLOOR(RAND() * 9000) + 1000, 4, '0')
    );
  END IF;
END$$

-- Auto-generate quotation reference
CREATE TRIGGER trg_quotations_before_insert
BEFORE INSERT ON quotations
FOR EACH ROW
BEGIN
  IF NEW.quotation_ref IS NULL OR NEW.quotation_ref = '' THEN
    SET NEW.quotation_ref = CONCAT(
      'QUO-',
      DATE_FORMAT(NOW(), '%Y%m%d'),
      '-',
      LPAD(FLOOR(RAND() * 9000) + 1000, 4, '0')
    );
  END IF;
END$$

-- Auto-increment slot current_bookings on new confirmed booking
CREATE TRIGGER trg_bookings_after_insert
AFTER INSERT ON bookings
FOR EACH ROW
BEGIN
  UPDATE slots
  SET current_bookings = current_bookings + 1
  WHERE id = NEW.slot_id;
END$$

-- Adjust slot count when booking is cancelled
CREATE TRIGGER trg_bookings_after_status_update
AFTER UPDATE ON bookings
FOR EACH ROW
BEGIN
  IF OLD.status != 'Cancelled' AND NEW.status = 'Cancelled' THEN
    UPDATE slots
    SET current_bookings = GREATEST(current_bookings - 1, 0)
    WHERE id = NEW.slot_id;
  END IF;
  IF OLD.status = 'Cancelled' AND NEW.status != 'Cancelled' THEN
    UPDATE slots
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.slot_id;
  END IF;
END$$

DELIMITER ;

-- ─────────────────────────────────────────────────────────────
-- VIEWS
-- ─────────────────────────────────────────────────────────────

-- Booking summary view (joins all key related tables)
CREATE OR REPLACE VIEW v_bookings_summary AS
SELECT
  b.id                     AS booking_id,
  b.booking_ref,
  b.status,
  b.priority,
  b.property_type,
  b.preferred_visit_date,
  b.num_rooms,
  b.estimated_budget,
  b.city,
  b.pincode,
  b.created_at,
  b.updated_at,
  u.full_name              AS client_name,
  u.email                  AS client_email,
  u.mobile_number          AS client_mobile,
  pt.name                  AS project_type,
  CONCAT(s.start_time, ' - ', s.end_time) AS slot_time,
  s.slot_date,
  da.staff_user_id         AS designer_user_id,
  du.full_name             AS designer_name,
  ea.staff_user_id         AS engineer_user_id,
  eu.full_name             AS engineer_name
FROM bookings b
JOIN clients c   ON b.client_id       = c.id
JOIN users u     ON c.user_id         = u.id
JOIN project_types pt ON b.project_type_id = pt.id
JOIN slots s     ON b.slot_id         = s.id
LEFT JOIN assignments da ON da.booking_id = b.id
  AND da.staff_role = 'Designer'    AND da.status = 'Active'
LEFT JOIN users du ON da.staff_user_id = du.id
LEFT JOIN assignments ea ON ea.booking_id = b.id
  AND ea.staff_role = 'Site Engineer' AND ea.status = 'Active'
LEFT JOIN users eu ON ea.staff_user_id = eu.id;

-- Slot availability view
CREATE OR REPLACE VIEW v_slot_availability AS
SELECT
  id,
  slot_date,
  start_time,
  end_time,
  max_bookings,
  current_bookings,
  (max_bookings - current_bookings) AS available_spots,
  CASE
    WHEN current_bookings >= max_bookings THEN 'Full'
    WHEN current_bookings >= (max_bookings * 0.75) THEN 'Filling Fast'
    ELSE 'Available'
  END AS availability_label,
  is_active
FROM slots
WHERE slot_date >= CURDATE();

-- Dashboard metrics view (admin)
CREATE OR REPLACE VIEW v_dashboard_metrics AS
SELECT
  (SELECT COUNT(*)   FROM users   WHERE role_id = 2 AND is_active = 1) AS total_clients,
  (SELECT COUNT(*)   FROM bookings)                                       AS total_bookings,
  (SELECT COUNT(*)   FROM bookings WHERE status = 'Pending')              AS pending_bookings,
  (SELECT COUNT(*)   FROM bookings WHERE status = 'Confirmed')            AS confirmed_bookings,
  (SELECT COUNT(*)   FROM bookings WHERE status = 'Completed')            AS completed_bookings,
  (SELECT COUNT(*)   FROM bookings WHERE status = 'Cancelled')            AS cancelled_bookings,
  (SELECT COUNT(*)   FROM bookings WHERE preferred_visit_date = CURDATE()
    AND status NOT IN ('Cancelled'))                                       AS todays_visits,
  (SELECT COUNT(*)   FROM bookings WHERE preferred_visit_date BETWEEN DATE_ADD(CURDATE(), INTERVAL 1 DAY)
    AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    AND status NOT IN ('Cancelled'))                                       AS upcoming_visits_7d,
  (SELECT COUNT(*)   FROM designers WHERE status = 'Active')              AS active_designers,
  (SELECT COUNT(*)   FROM site_engineers WHERE status = 'Active')         AS active_engineers;
