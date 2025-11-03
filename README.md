# Gemini Form Builder Backend

A comprehensive Node.js backend API featuring OAuth 2.0 authentication, Attribute-Based Access Control (ABAC), AWS DynamoDB integration, and dual subscription models (package-based + usage-based).

## Features

### 🔐 Authentication & Authorization
- **Multi-Provider OAuth 2.0**: Google, GitHub (extensible to more providers)
- **JWT-based Authentication**: Secure token generation with refresh capability
- **Advanced ABAC Engine**: 
  - Field-level permissions
  - Time-based access control
  - Geo-location restrictions
  - Custom policy expressions
  - Resource ownership validation

### 💳 Subscription Management
- **Package Tiers**:
  - **Free**: 10 forms, 100 fields, 1000 API calls/month
  - **Pro** ($29/mo): 100 forms, unlimited fields, 50k API calls/month
  - **Enterprise** ($199/mo): Unlimited resources + custom policies
  
- **Usage-Based Billing**:
  - Overage charges for exceeding limits
  - $0.01 per 100 extra API calls
  - $1 per 10 extra forms
  - Real-time usage tracking

### 📊 Usage Tracking & Analytics
- Real-time API call metering
- Monthly usage reports
- Usage event history
- Automatic usage reset at month start

### 🚀 Performance & Security
- Tier-based rate limiting (60-6000 requests/minute)
- Request/response logging with Winston
- Helmet.js security headers
- CORS protection
- Input validation with Zod
- DynamoDB optimized queries with GSIs

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **Database**: AWS DynamoDB
- **Authentication**: Passport.js + JWT
- **Authorization**: Custom ABAC engine
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS

## Prerequisites

- Node.js 20 or higher
- AWS Account with DynamoDB access
- Google Cloud Console project (for Google OAuth)
- GitHub OAuth App (for GitHub OAuth)

## Installation

### 1. Clone and Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Server
NODE_ENV=development
PORT=3001

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# AWS DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
DYNAMODB_TABLE_PREFIX=gemini-form-builder

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Frontend
FRONTEND_URL=http://localhost:5173
OAUTH_CALLBACK_BASE_URL=http://localhost:3001/api/auth
```

### 3. AWS DynamoDB Setup

Create the following DynamoDB tables with these configurations:

#### Users Table
- **Table Name**: `gemini-form-builder-users`
- **Partition Key**: `id` (String)
- **GSI 1**: `EmailIndex` - Partition Key: `email` (String)
- **GSI 2**: `OAuthIndex` - Partition Key: `oauthProvider` (String), Sort Key: `oauthId` (String)

#### Forms Table
- **Table Name**: `gemini-form-builder-forms`
- **Partition Key**: `id` (String)
- **GSI 1**: `UserIdIndex` - Partition Key: `userId` (String), Sort Key: `createdAt` (String)

#### Subscriptions Table
- **Table Name**: `gemini-form-builder-subscriptions`
- **Partition Key**: `id` (String)
- **GSI 1**: `UserIdIndex` - Partition Key: `userId` (String)

#### Usage Table
- **Table Name**: `gemini-form-builder-usage`
- **Partition Key**: `id` (String)

#### Policies Table
- **Table Name**: `gemini-form-builder-policies`
- **Partition Key**: `id` (String)
- **GSI 1**: `UserIdIndex` - Partition Key: `userId` (String)

### 4. OAuth Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3001/api/auth/google/callback`
6. Copy Client ID and Secret to `.env`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:3001/api/auth/github/callback`
4. Copy Client ID and Secret to `.env`

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Health Check
```bash
curl http://localhost:3001/health
```

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Authentication Flow

#### 1. Initiate OAuth Login
```http
GET /api/auth/google
GET /api/auth/github
```
Redirects to OAuth provider login page.

#### 2. OAuth Callback
```http
GET /api/auth/google/callback
GET /api/auth/github/callback
```
Handles OAuth callback and redirects to frontend with tokens.

#### 3. Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": "7d",
  "tokenType": "Bearer"
}
```

#### 4. Get Current User
```http
GET /api/auth/me
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "subscriptionTier": "free"
  }
}
```

### User Management

#### Get Current User Profile
```http
GET /api/users/me
Authorization: Bearer {access_token}
```

#### Update Profile
```http
PATCH /api/users/me
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Jane Doe",
  "avatar": "https://example.com/avatar.jpg"
}
```

#### Get User Statistics
```http
GET /api/users/me/stats
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "stats": {
    "formCount": 5,
    "fieldCount": 42,
    "apiCallsThisMonth": 234,
    "totalApiCalls": 1523
  }
}
```

### Form Management

#### Create Form
```http
POST /api/forms
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Customer Survey",
  "description": "Annual customer satisfaction survey",
  "visibility": "private"
}
```

#### Get User's Forms
```http
GET /api/forms?limit=20
Authorization: Bearer {access_token}
```

#### Get Form by ID
```http
GET /api/forms/{formId}
Authorization: Bearer {access_token}
```

#### Update Form
```http
PATCH /api/forms/{formId}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Updated Title",
  "visibility": "public",
  "fields": [...]
}
```

#### Delete Form
```http
DELETE /api/forms/{formId}
Authorization: Bearer {access_token}
```

### Subscription Management

#### Get Current Subscription
```http
GET /api/subscriptions/me
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "subscription": {
    "id": "sub_123",
    "tier": "pro",
    "status": "active",
    "limits": {
      "forms": 100,
      "fields": 999999,
      "apiCalls": 50000
    }
  }
}
```

#### Check Subscription Limits
```http
GET /api/subscriptions/me/limits
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "formsAllowed": true,
  "fieldsAllowed": true,
  "apiCallsAllowed": false,
  "limits": {
    "forms": 100,
    "fields": 999999,
    "apiCalls": 50000
  },
  "usage": {
    "forms": 45,
    "fields": 523,
    "apiCalls": 50123
  }
}
```

#### Get Pricing
```http
GET /api/subscriptions/pricing
```

#### Upgrade Subscription
```http
POST /api/subscriptions/upgrade
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "tier": "pro",
  "billingCycle": "monthly"
}
```

#### Calculate Overage Charges
```http
GET /api/subscriptions/me/overage
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "charges": [
    {
      "type": "api_calls",
      "quantity": 123,
      "unitPrice": 1,
      "totalAmount": 2,
      "description": "123 extra API calls"
    }
  ],
  "totalAmount": 2,
  "currency": "USD"
}
```

### Usage Tracking

#### Get Current Month Usage
```http
GET /api/usage/me
Authorization: Bearer {access_token}
```

#### Get Usage History
```http
GET /api/usage/me/history
Authorization: Bearer {access_token}
```

#### Get Recent Usage Events
```http
GET /api/usage/me/events?limit=100
Authorization: Bearer {access_token}
```

## ABAC Policy System

### Default Policies

The system comes with pre-configured ABAC policies:

1. **Form Owner Full Access**: Owners have full control over their forms
2. **Public Form Read Access**: Anyone can read public forms
3. **Premium Field Access**: Pro/Enterprise users can access premium fields
4. **Admin Full Access**: Admins bypass all restrictions
5. **Free Tier Limits**: Enforce free tier form creation limits

### Custom Policies (Enterprise Only)

Enterprise users can create custom ABAC policies with advanced conditions:

```json
{
  "name": "Weekend Only Access",
  "resource": "analytics",
  "action": "read",
  "effect": "allow",
  "conditions": {
    "time": {
      "daysOfWeek": [0, 6]
    }
  },
  "priority": 100
}
```

## Rate Limiting

Rate limits are enforced per subscription tier:

- **Free**: 60 requests/minute
- **Pro**: 600 requests/minute
- **Enterprise**: 6000 requests/minute
- **Unauthenticated**: 30 requests/minute

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": []
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Resource created
- `400`: Bad request / Validation error
- `401`: Authentication required / Invalid token
- `403`: Access denied by ABAC policy / Insufficient permissions
- `404`: Resource not found
- `429`: Rate limit exceeded / Subscription limit exceeded
- `500`: Internal server error

## Logging

Logs are written to:
- Console (formatted for development)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── models/          # Data models
│   ├── repositories/    # Database operations
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── logs/                # Log files
├── package.json
├── tsconfig.json
└── .env
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

## Deployment

### Environment Variables for Production

Ensure these are properly configured:
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure AWS credentials with IAM roles (not access keys)
- Use HTTPS for `FRONTEND_URL` and `OAUTH_CALLBACK_BASE_URL`
- Enable DynamoDB encryption at rest

### Security Checklist

- ✅ Enable HTTPS
- ✅ Use environment variables for secrets
- ✅ Configure CORS properly
- ✅ Enable rate limiting
- ✅ Set up DynamoDB backups
- ✅ Monitor CloudWatch logs
- ✅ Use AWS IAM roles (not access keys)
- ✅ Regular security audits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues and questions:
- GitHub Issues: [Project Issues](https://github.com/your-repo/issues)
- Email: support@example.com

---

**Built with ❤️ using Node.js, TypeScript, and AWS**


