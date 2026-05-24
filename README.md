# CloudDeploy — Deployment Control Panel

A full-stack deployment automation platform that deploys Docker containers on EC2 using a background queue and updates deployment status live on the frontend.

## Architecture

```
React Frontend (Vite)
      ↓
Node.js API (Express)
      ↓
MongoDB (save deployment data)
      ↓
BullMQ Queue (Redis)
      ↓
Worker Process
      ↓
EC2 Server + Docker (SSH / SSM)
      ↓
AWS Lambda (SDK v3)
      ↓
Update MongoDB Status
      ↓
Frontend polls status (auto-refresh)
```

## Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Frontend         | React 18, Vite, Axios, React Icons  |
| Backend API      | Node.js, Express                    |
| Database         | MongoDB (Mongoose)                  |
| Queue            | Redis + BullMQ                      |
| Docker on EC2    | node-ssh (SSH) or AWS SSM           |
| AWS Lambda       | AWS SDK v3 (`@aws-sdk/client-lambda`) |
| Logging          | Winston                             |

## Folder Structure

```
deployment/
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx           # React entry point
│       ├── App.jsx            # Main app with polling
│       ├── api.js             # API service layer
│       ├── index.css          # Premium dark theme CSS
│       └── components/
│           ├── Header.jsx          # Branding & live indicator
│           ├── DeployForm.jsx      # Onboarding form
│           ├── DeploymentList.jsx  # Live status dashboard
│           └── StatsBar.jsx        # Stats overview bar
├── backend/
│   ├── server.js              # Express API server
│   ├── worker.js              # BullMQ deployment worker
│   ├── package.json
│   ├── .env                   # Environment variables
│   ├── .env.example
│   ├── config/
│   │   └── index.js           # Centralized config
│   ├── models/
│   │   └── Deployment.js      # Mongoose schema
│   ├── routes/
│   │   └── deploy.js          # API routes
│   ├── queue/
│   │   └── deployQueue.js     # BullMQ queue setup
│   ├── services/
│   │   ├── dockerService.js   # Docker via SSH/SSM
│   │   └── lambdaService.js   # AWS Lambda invoke
│   └── utils/
│       └── logger.js          # Winston logger
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- AWS account (for Lambda & EC2)
- EC2 instance with Docker installed

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Configure Environment

Edit `backend/.env` with your actual values:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/deployment-platform

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
LAMBDA_FUNCTION_NAME=post-deployment-setup

# EC2 SSH Configuration
EC2_HOST=54.xx.xx.xx
EC2_USERNAME=ubuntu
EC2_PRIVATE_KEY_PATH=./keys/ec2-key.pem

# EC2 SSM (Alternative to SSH)
EC2_INSTANCE_ID=i-xxxxxxxxxxxxxxxxx
USE_SSM=false
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Start Services

**Terminal 1 — Start MongoDB** (if local):
```bash
mongod
```

**Terminal 2 — Start Redis** (if local):
```bash
redis-server
```

**Terminal 3 — Start Backend API:**
```bash
cd backend
npm run dev
```

**Terminal 4 — Start Worker:**
```bash
cd backend
npm run worker
```

**Terminal 5 — Start Frontend:**
```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:3000`  
Backend API runs at: `http://localhost:5000`

## API Endpoints

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| POST   | `/api/deploy`         | Create a new deployment        |
| GET    | `/api/status/:id`     | Get deployment status by ID    |
| GET    | `/api/deployments`    | List all deployments           |
| DELETE | `/api/deployments/:id`| Delete a deployment record     |
| GET    | `/health`             | Server health check            |

### POST /api/deploy

```json
{
  "clientName": "Acme Corp",
  "domain": "acme.ourplatform.com",
  "image": "nginx:latest"
}
```

Response:
```json
{
  "success": true,
  "message": "Deployment queued successfully",
  "deploymentId": "664f..."
}
```

### GET /api/status/:id

```json
{
  "success": true,
  "deployment": {
    "id": "664f...",
    "clientName": "Acme Corp",
    "domain": "acme.ourplatform.com",
    "image": "nginx:latest",
    "status": "Completed",
    "containerId": "abc123def456",
    "port": 3042,
    "logs": "...",
    "createdAt": "2026-05-24T04:15:00.000Z"
  }
}
```

## Deployment Flow

1. **User submits form** → React sends `POST /api/deploy`
2. **API saves to MongoDB** with status `"Pending"` and pushes job to BullMQ queue
3. **API returns immediately** with `200 OK` (non-blocking)
4. **Worker picks up the job** from BullMQ queue
5. **Worker connects to EC2** via SSH (or SSM) and runs:
   - `docker pull <image>`
   - `docker run -d --name <container> -p <port>:80 <image>`
6. **Worker triggers Lambda** via AWS SDK v3 `InvokeCommand` for post-deployment setup
7. **Worker updates MongoDB** status to `"Completed"` or `"Failed"`
8. **Frontend polls** `GET /api/status/:id` every 3 seconds and auto-updates the UI

## Key Features

- **Real-time status updates** via polling (3s interval for active deployments)
- **Background job processing** with BullMQ (Redis-backed queue)
- **Automatic retries** — failed jobs retry 3 times with exponential backoff
- **SSH & SSM support** — choose between direct SSH or AWS SSM for EC2 commands
- **Progress pipeline visualization** in the UI
- **Expandable deployment cards** with logs viewer
- **Docker image presets** for quick selection
- **Premium dark theme** with glassmorphism and micro-animations
