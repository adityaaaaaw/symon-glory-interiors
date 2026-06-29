# Glory Simon Interiors — REST API Documentation

Base URL: `http://localhost:5000/api` or `https://yourdomain.com/api`

---

## 🔒 Authentication Headers

All protected endpoints require a JWT Bearer token passed in the `Authorization` header:

```http
Authorization: Bearer <jwt-token-string>
```

---

## 🔑 Authentication Endpoints

### 1. Client Registration
Submit client details to register a new account.
- **URL**: `/auth/register`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "full_name": "Jane Doe",
    "mobile_number": "9876543210",
    "email": "jane@example.com",
    "password": "Password@123"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registration successful. Welcome to Glory Simon Interiors!",
    "token": "eyJhbGciOi...",
    "user": {
      "id": 10,
      "email": "jane@example.com",
      "role_id": 2,
      "role_name": "Client",
      "full_name": "Jane Doe",
      "mobile_number": "9876543210"
    }
  }
  ```

### 2. User Login
Authenticate users for all system roles.
- **URL**: `/auth/login`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful.",
    "token": "eyJhbGciOi...",
    "user": {
      "id": 10,
      "email": "jane@example.com",
      "role_id": 2,
      "role_name": "Client",
      "full_name": "Jane Doe"
    }
  }
  ```

### 3. Get Authenticated Profile
Retrieve current logged-in user profile.
- **URL**: `/auth/me`
- **Method**: `GET`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": 10,
      "email": "jane@example.com",
      "role_id": 2,
      "role_name": "Client",
      "full_name": "Jane Doe",
      "mobile_number": "9876543210"
    }
  }
  ```

---

## 📅 Time Slots Endpoints

### 1. List Available Slots
Get all active slots for a given date.
- **URL**: `/slots`
- **Method**: `GET`
- **Query Params**: `?date=YYYY-MM-DD`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Slots fetched successfully.",
    "data": [
      {
        "id": 1,
        "slot_date": "2026-07-01",
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "max_bookings": 3,
        "current_bookings": 1,
        "available_spots": 2,
        "availability_label": "Available"
      }
    ]
  }
  ```

### 2. Create Time Slot
Create a new slot (Admin only).
- **URL**: `/slots`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "slot_date": "2026-08-01",
    "start_time": "14:00:00",
    "end_time": "16:00:00",
    "max_bookings": 5
  }
  ```

---

## 📝 Booking Endpoints

### 1. Submit Site Visit Booking
Submit a site visit request (Client only).
- **URL**: `/bookings`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "property_type": "Residential",
    "project_type_id": 1,
    "address": "123 Luxury Ave",
    "city": "Chennai",
    "pincode": "600001",
    "preferred_visit_date": "2026-07-01",
    "slot_id": 5,
    "num_rooms": 3,
    "estimated_budget": 800000,
    "project_description": "Full modular home redesign"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Your site visit booking has been submitted successfully.",
    "booking": {
      "id": 101,
      "booking_ref": "GS-20260616-A23F",
      "property_type": "Residential",
      "status": "Pending",
      "priority": "High"
    }
  }
  ```

### 2. Cancel Booking
- **URL**: `/bookings/:id/cancel`
- **Method**: `PATCH`
- **Payload**:
  ```json
  {
    "cancellation_reason": "Moving out of city."
  }
  ```

### 3. Update Status
- **URL**: `/bookings/:id/status`
- **Method**: `PATCH`
- **Payload**:
  ```json
  {
    "status": "Confirmed"
  }
  ```

---

## 👥 Staff Assignment Endpoints

### 1. Assign Staff (Admin only)
- **URL**: `/assignments`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "booking_id": 101,
    "designer_user_id": 3,
    "engineer_user_id": 4,
    "notes": "Premium client request."
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Staff assigned successfully."
  }
  ```

---

## 📂 Report Endpoints

### 1. Submit Visit Report (Designer/Engineer only)
- **URL**: `/reports`
- **Method**: `POST`
- **Payload**:
  ```json
  {
    "booking_id": 101,
    "visit_date": "2026-07-10",
    "observations": "Excellent layout.",
    "design_suggestions": "Modular layout recommended.",
    "material_suggestions": "Acrylic finishes.",
    "budget_estimate": 450000,
    "measurements": [
      {
        "room_name": "Living Room",
        "length_ft": 15,
        "width_ft": 12,
        "height_ft": 10
      }
    ]
  }
  ```

### 2. Export PDF
Stream post-visit PDF report file.
- **URL**: `/reports/booking/:bookingId/export`
- **Method**: `GET`
- **Response**: Streams binary file stream of type `application/pdf`.

---

## 📊 Analytics & Dashboards

### 1. Admin Dashboard Metrics
- **URL**: `/dashboard/admin`
- **Method**: `GET`
- **Success Response (200 OK)**: Contains pipeline valuations, funnel percentages, and slot availability details.

### 2. Conversion Funnel Dashboard
- **URL**: `/dashboard/conversion`
- **Method**: `GET`
- **Success Response (200 OK)**: Contains stage counts from Enquiry down to Completed.
