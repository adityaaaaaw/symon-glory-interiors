-- Glory Simon Interiors - MySQL Production Database Schema Migration
-- Defines tables, relations, and operations rules for the Glory Simon Interiors platform.

CREATE DATABASE IF NOT EXISTS glory_simon_interiors;
USE glory_simon_interiors;

-- 1. Users Table (Clients, Admins, Designers, Engineers)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'client', 'admin', 'designer', 'engineer'
  phone VARCHAR(50),
  avatar TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Designers Table (Staff Registry)
CREATE TABLE IF NOT EXISTS designers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  avatar TEXT,
  region VARCHAR(100),
  rating DOUBLE DEFAULT 5.0,
  workload INT DEFAULT 0,
  experience INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Busy', 'On Leave'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Site Engineers Table (Staff Registry)
CREATE TABLE IF NOT EXISTS site_engineers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50),
  avatar TEXT,
  region VARCHAR(100),
  rating DOUBLE DEFAULT 5.0,
  workload INT DEFAULT 0,
  experience INT DEFAULT 0,
  availability VARCHAR(50) DEFAULT 'Available', -- 'Available', 'Busy', 'On Leave'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  booking_id_str VARCHAR(100) NOT NULL UNIQUE, -- e.g. GSI-2026-0001
  client_id INT NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  property_type VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_slot VARCHAR(100) NOT NULL,
  budget VARCHAR(100) DEFAULT 'Standard',
  notes TEXT,
  status VARCHAR(50) DEFAULT 'Pending', 
  -- Timeline: 'Draft', 'Pending', 'Confirmed', 'Assigned', 'Designer Accepted', 'Site Visit Scheduled', 
  --           'Site Visit In Progress', 'Site Visit Completed', 'Quotation Sent', 'Quotation Approved', 
  --           'Project Started', 'Project Completed', 'Cancelled'
  assigned_to_id INT DEFAULT NULL,
  assigned_to_role VARCHAR(50) DEFAULT NULL, -- 'designer', 'engineer'
  assignment_reason TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Booking Media Table (Attachments uploads)
CREATE TABLE IF NOT EXISTS booking_media (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Assignments History
CREATE TABLE IF NOT EXISTS assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  professional_id INT NOT NULL,
  professional_role VARCHAR(50) NOT NULL,
  reason TEXT,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Visit Reports Table (Includes Intelligent Visit Assistant output)
CREATE TABLE IF NOT EXISTS visit_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  booking_id INT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  recommendations TEXT,
  follow_ups TEXT,
  material_suggestions TEXT DEFAULT NULL,
  budget_estimate DOUBLE DEFAULT NULL,
  image_path VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Quotations Table (Normalized parent)
CREATE TABLE IF NOT EXISTS quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE,
  booking_id INT NOT NULL,
  subtotal DOUBLE NOT NULL,
  discount DOUBLE DEFAULT 0.0,
  gst DOUBLE DEFAULT 18.0, -- GST tax rate percent
  tax DOUBLE DEFAULT 0.0, -- absolute calculated GST tax amount
  grand_total DOUBLE NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  reason TEXT DEFAULT NULL, -- Rejection description
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Quotation Items Table (Normalized children)
CREATE TABLE IF NOT EXISTS quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  description VARCHAR(255) NOT NULL,
  qty INT NOT NULL,
  unit_price DOUBLE NOT NULL,
  amount DOUBLE NOT NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Booking Notes Table (Internal staff communications)
CREATE TABLE IF NOT EXISTS booking_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. CRM Tasks Table (Follow-ups & reminders)
CREATE TABLE IF NOT EXISTS crm_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Completed'
  assigned_to_id INT DEFAULT NULL, -- User/professional ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Communication History (Unified logs center)
CREATE TABLE IF NOT EXISTS communication_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  channel VARCHAR(50) NOT NULL, -- 'Email', 'WhatsApp', 'SMS', 'Push'
  type VARCHAR(50) NOT NULL, -- 'Booking Confirmation', 'Rescheduled Notification', 'Quotation Dispatched'
  recipient VARCHAR(255) NOT NULL,
  message_preview TEXT,
  status VARCHAR(50) DEFAULT 'Sent',
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Notifications Table (In-app center)
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'system',
  is_read TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Booking Activities Table (Timeline audit)
CREATE TABLE IF NOT EXISTS booking_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
