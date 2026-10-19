# MedResQ Java backend

The existing React/Vite UI now uses Spring Boot REST endpoints. Java 21 or newer and Maven 3.6.3 or newer are required. A Maven wrapper is included so a separate Maven installation is unnecessary.

## MySQL setup in Workbench

Your local MySQL Server 8.0 is the development database. Connect to it in MySQL Workbench using your existing administrator account. Open [setup-mysql.sql](setup-mysql.sql), replace the password placeholder with your own strong password, and execute it. This creates the dedicated `medresq` database and a `medresq` user restricted to that database. If that user already exists, use its existing password; the script does not reset it.

The backend uses `jdbc:mysql://localhost:3306/medresq` by default. Override `DATABASE_URL`, `DATABASE_USER`, and `DATABASE_PASSWORD` if your server uses another host, port, or account. Set the password locally; do not commit it or send it in chat. The Java application creates its own tables with the MySQL-specific schema on startup. MySQL Workbench is the administration client; the MySQL Server service must be running.

The SQL tables are `documents`, `accounts`, `sessions`, and `workflow_lock`. The current implementation stores typed JSON payloads in SQL tables, rather than separate normalized tables for each hospital/referral field. InnoDB transactions protect bed allocation and discharge.

## Run on Windows

To enter your database password at a private prompt instead of setting environment variables manually, run:

```powershell
cd D:\hospital-bed-dashboard\backend
powershell -NoProfile -ExecutionPolicy Bypass -File .\start-backend.ps1
```

Type the `medresq` MySQL user's password when asked, without adding quotes, then press Enter. Typing is hidden. The script passes the credentials to Maven in the same process and does not save the password in a file. Use Ctrl+C to stop the backend. A MySQL error saying `using password: NO` means no password reached the server; `using password: YES` means a password was supplied but rejected.

From `D:\hospital-bed-dashboard`, use two terminals:

```powershell
cd backend
$env:DATABASE_USER="medresq"
$env:DATABASE_PASSWORD="the-password-you-set-in-Workbench"
.\mvnw.cmd spring-boot:run
```

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). The frontend proxies `/api` to http://localhost:8080. Opening the root `index.html` directly does not run the application. Application records are saved in your local MySQL Server, in the `medresq` database. H2 is used only for isolated automated tests; it is no longer the application database. Existing H2 data is not automatically migrated or deleted.

Local development includes the frontend's 12 hospitals with **sample capacities**, plus three sample ambulance records. These records are not connected to those hospitals' operational systems. The officer login is `admin@medresq.gov` / `admin`. Hospital-specific development logins use the hospital email shown in the UI and the same password. The officer can manage all hospitals; a hospital account can only manage its assigned hospital.

Patient login generates a random four-digit development code, displayed in the login modal. Codes expire after five minutes, allow at most five wrong attempts, and cannot be reused. No SMS is sent. Sessions expire after eight hours and logout revokes the server token.

## Frontend requirements and implementation

| Existing frontend behavior | Backend implementation |
| --- | --- |
| Hospital lists, maps, region/bed/resource/specialist filters | Persisted hospital objects preserve existing field names; UI filters public API data |
| Hospital profile and six bed categories | Authorized updates, capacity validation, optimistic version checks |
| Patient admission form and vitals | Validated referral creation, patient ownership |
| Approve / reject / admit / discharge | Transactional status machine; approval reserves one bed, discharge releases it |
| Hospital admin and patient login | BCrypt passwords, opaque bearer sessions with only token hashes saved in DB; development OTP verification |
| Ambulance markers | Persistent status and coordinates; approval assigns an available vehicle; operator API updates position |
| Notification center | Persistent notices filtered by audience and per-user read receipts |
| SOS and disaster mode | Persisted SOS requests and officer-only disaster state |
| Capacity analytics | API aggregates saved inventory; frontend CSV export uses current records |

The UI polls every eight seconds. The old random occupancy changes and simulated ambulance movement have been removed from the app. Bed edits retain their original version while the form is dirty, so polling cannot overwrite an administrator's changes silently. A stale save returns HTTP 409.

Referral transitions: `pending -> approved | rejected`, `approved -> admitted`, `admitted -> discharged`. Repeating the current status does nothing. Other transitions return 409. Only approval and discharge change inventory. If no ambulance is available, approval still reserves the bed and the UI explicitly shows that transport is waiting.

Persistence uses JDBC and typed JSON documents in a relational `documents` table, with separate `accounts`, `sessions`, and `workflow_lock` tables. All clinical workflow mutations acquire one database row lock inside a transaction. This deliberately favors consistency for this starter implementation; a larger installation should normalize/index clinical tables and replace the global lock with hospital-level locks. Public endpoints do not return patient referrals or ambulance referral IDs.

## API

All paths are relative to `/api`. Protected requests require `Authorization: Bearer <token>`.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health`, `/hospitals`, `/hospitals/{id}`, `/ambulances`, `/system`, `/analytics` | Public |
| POST | `/auth/login` | Email/password |
| POST | `/auth/otp/send`, `/auth/otp/verify` | Development patient login |
| GET / POST | `/auth/me`, `/auth/logout` | Signed in |
| POST | `/hospitals`, `/accounts` | Officer |
| PUT | `/hospitals/{id}` | Assigned hospital admin or officer |
| GET | `/referrals`, `/notifications`, `/sos` | Records scoped to signed-in user |
| POST | `/referrals` | Patient |
| PATCH | `/referrals/{id}/status` | Assigned hospital admin or officer |
| PATCH | `/notifications/{id}/read` | Notice recipient |
| PATCH | `/ambulances/{id}` | Officer |
| PUT | `/system` | Officer |
| POST | `/sos` | Signed in |
| PATCH | `/sos/{id}/cancel` | SOS owner |
| PATCH | `/sos/{id}/status` | Officer (`acknowledged`, then `resolved`) |

Example login body: `{"email":"admin@medresq.gov","password":"admin"}`. OTP send body: `{"phone":"9876543210"}`; verify body: `{"phone":"9876543210","code":"<displayed code>"}`. Referral status body: `{"status":"approved"}`. Ambulance position body: `{"coords":{"lat":28.58,"lng":77.22},"status":"transit"}`. System body: `{"disasterMode":true}`.

Hospital creation accepts the same object shape as `GET /hospitals`: a unique ID, profile, valid coordinates, and all six inventory categories. Account creation accepts `email`, `password` (12–72 characters), and an existing `hospitalId`. Account email is a login identifier, independent of the hospital's editable contact email.

## Tests and build

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
java -jar target/medresq-backend-1.0.0.jar
```

Default tests run on isolated H2 databases and do not verify a live MySQL connection. Tests cover authentication/logout, OTP replay, patient privacy, hospital scope, inventory validation, stale saves, repeated transitions, and simultaneous requests for the last ICU bed. Frontend validation: `npm run build` and `npm run lint` from the project root.

## Production deployment

Use a **new MySQL database** and `SPRING_PROFILES_ACTIVE=prod`. Production starts without demo hospital/ambulance data. Configure `DATABASE_URL` as a JDBC URL, `DATABASE_USER`, `DATABASE_PASSWORD`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` (at least 12 characters). Existing credentials persist: changing the initial password environment variable does not reset an existing account.

The root Dockerfile builds React into the Java JAR, so one server serves both the UI and `/api`. Copy `.env.example` to `.env`, set the database, MySQL root, and application administrator password variables, then:

```powershell
docker compose up --build -d
```

Open http://localhost:8080. Use a TLS reverse proxy for an internet deployment. Hospital data and hospital accounts can be provisioned with the officer APIs. A separately hosted frontend can use `VITE_API_URL`; configure the exact frontend origin with `ALLOWED_ORIGINS` on the backend.

SMS delivery is deliberately unavailable in production until a provider is implemented. SOS records require operator response; they do not contact emergency services. Ambulance coordinates require an operator or tracking provider to submit updates. Symptom matching, queue-time estimates, map traffic/heatmap overlays, and the QR illustration remain frontend demos; they are not clinical diagnosis, live traffic, or verified kiosk check-in. The capacity projection is explicitly a baseline estimate, not a trained demand forecast. Docker/MySQL deployment must be verified in the target environment.
