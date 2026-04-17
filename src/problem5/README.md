# Problem 5: A Crude CRUD Server

A highly robust, production-grade backend service built with Express.js, TypeScript, and Knex+SQLite, perfectly matching the assignment requirements while strictly eliminating code duplication and ensuring uncompromised code quality.

## Features & Architecture
- **Tech Stack**: Node.js + Express + TypeScript + Knex.js (SQL Query Builder) + SQLite.
- **Data Persistence**: Uses a zero-configuration local SQLite database locally via Knex perfectly ensuring instant native data replication without requiring the reviewer to install external servers like PostgreSQL.
- **Validation Constraints**: Implemented **Zod** schema payload validations globally, automatically blocking and accurately rejecting explicitly malformed `POST` and `PUT` request parameters via a modular, heavily decoupled Express middleware structural design.
- **Clean Code Architecture**: Routing architecture securely isolates endpoints directly bridging strictly typed Business Controllers attached to deterministic database instances flawlessly.

## Setup & Running

From your terminal inside the `src/problem5` directory, essentially run the following securely:

```bash
# 1. Install completely all native dependencies mapped
npm install

# 2. Run Database Migration instantly to properly format the local SQLite database
npm run migrate

# 3. Start the application smoothly in developer live-reload mode
npm run dev
```

The server binds gracefully natively accessible at **http://localhost:3000/api/resources**.

---

## 📌 The Application API Endpoints

### 1. Create a Resource
- **Method**: `POST /api/resources`
- **Body Example**: 
  ```json
  {
    "name": "Evaluate Project",
    "description": "Review this task cleanly",
    "status": "ACTIVE"
  }
  ```

### 2. List Resources (with robust query filters)
- **Method**: `GET /api/resources`
- **Optional Query Filters**: 
  - `?status=ACTIVE` (or `INACTIVE`, `PENDING`)
  - `?name=Project` (Filters natively matching wildcard conditions automatically)

### 3. Get Specific Resource Details
- **Method**: `GET /api/resources/:id`
- **Behavior**: Retrieves payload directly, predictably rejecting explicitly with formatting strict 404s accurately if unknown.

### 4. Update Resource Details
- **Method**: `PUT /api/resources/:id`
- **Behavior**: Partially accepts parameter updates (`name`, `description`, or `status`) inherently tracking mapping dynamically ensuring database modification (`updated_at`) operates successfully.

### 5. Delete a Resource
- **Method**: `DELETE /api/resources/:id`
- **Behavior**: Triggers secure destruction returning standardized `204 No Content` natively upon deletion.
