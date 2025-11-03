# Quick Start Guide

Get your backend running in 5 minutes!

## 1. Install Dependencies
```bash
cd backend
npm install
```

## 2. Setup Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# Minimum required:
# - JWT_SECRET (generate with: openssl rand -base64 32)
# - AWS credentials
# - At least one OAuth provider (Google or GitHub)
```

## 3. Setup DynamoDB Tables
```bash
# Using the automated script
npx tsx scripts/setup-dynamodb.ts

# OR manually create tables in AWS Console (see README.md)
```

## 4. Start Development Server
```bash
npm run dev
```

Server will start at `http://localhost:3001`

## 5. Test the API

### Health Check
```bash
curl http://localhost:3001/health
```

### Try OAuth Login
Visit in browser:
```
http://localhost:3001/api/auth/google
# or
http://localhost:3001/api/auth/github
```

## Common Issues

### "AWS credentials not configured"
- Ensure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are in `.env`
- Or configure AWS CLI: `aws configure`

### "OAuth error"
- Verify OAuth credentials in `.env`
- Check redirect URIs in OAuth app settings
- Ensure `FRONTEND_URL` matches your frontend origin

### "Table not found"
- Run the DynamoDB setup script: `npx tsx scripts/setup-dynamodb.ts`
- Wait a few minutes for tables to become active

## Next Steps

1. **Setup Frontend**: Configure frontend to use backend API
2. **Test Authentication**: Complete OAuth flow end-to-end
3. **Create Test Data**: Use API to create forms and test features
4. **Review Documentation**: Read full README.md for detailed API docs
5. **Configure ABAC**: Customize policies in `src/config/abac.config.ts`

## Useful Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build           # Compile TypeScript
npm start               # Run production server

# Code Quality
npm run lint            # Check code style
npm run format          # Format code with Prettier

# Database
npx tsx scripts/setup-dynamodb.ts  # Setup tables
```

## API Testing with cURL

### Get Access Token (after OAuth)
```bash
TOKEN="your-access-token-here"
```

### Create a Form
```bash
curl -X POST http://localhost:3001/api/forms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First Form",
    "description": "Testing the API",
    "visibility": "private"
  }'
```

### Get Your Forms
```bash
curl http://localhost:3001/api/forms \
  -H "Authorization: Bearer $TOKEN"
```

### Check Subscription
```bash
curl http://localhost:3001/api/subscriptions/me \
  -H "Authorization: Bearer $TOKEN"
```

### View Usage Stats
```bash
curl http://localhost:3001/api/usage/me \
  -H "Authorization: Bearer $TOKEN"
```

## Development Tips

1. **Use Postman/Insomnia**: Import API endpoints for easier testing
2. **Enable Debug Logs**: Set `LOG_LEVEL=debug` in `.env`
3. **Hot Reload**: Code changes auto-restart server in dev mode
4. **TypeScript**: Use VSCode for best IntelliSense experience

## Need Help?

- 📖 Full documentation: See `README.md`
- 🚀 Deployment guide: See `DEPLOYMENT.md`
- 🐛 Issues: Check error logs in `logs/` directory
- 💬 Questions: Open a GitHub issue

Happy coding! 🎉


