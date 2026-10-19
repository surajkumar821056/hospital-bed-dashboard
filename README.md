# MedResQ Health

Hospital capacity and admission dashboard built with React/Vite and a Java Spring Boot backend.

## Run locally

Requires Node.js 22.12+, Java 21+, and a running MySQL Server. First run [backend/setup-mysql.sql](backend/setup-mysql.sql) in MySQL Workbench after replacing its password placeholder. From the project root, start the backend in one terminal:

```powershell
cd backend
$env:DATABASE_USER="medresq"
$env:DATABASE_PASSWORD="your-MySQL-password"
.\mvnw.cmd spring-boot:run
```

Start the frontend in another terminal:

```powershell
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173). Backend: http://localhost:8080/api/health.

Development officer login: **admin@medresq.gov / admin**. Hospital logins use the hospital contact emails and password **admin**. Patient login displays a generated development code; no SMS is sent.

The backend persists hospitals, bed inventories, referrals, ambulance records, notifications, SOS requests, and disaster mode. Hospital approval reserves a bed; admission and discharge are validated transitions. Patient records are private to the patient and authorized administrators. The frontend refreshes saved data every eight seconds.

Development hospital capacities and ambulance locations are sample data. Production needs real data, an SMS provider, and a tracking/dispatch integration. Symptom matching, queue estimates, traffic overlays, and QR illustrations remain demos. Capacity projections are a baseline from current inventory.

See [backend/README.md](backend/README.md) for the API, authentication rules, database design, tests, and production deployment with MySQL and Docker Compose.
