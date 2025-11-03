# Deployment Guide

## AWS Deployment with Elastic Beanstalk

### Prerequisites
- AWS CLI installed and configured
- EB CLI installed: `pip install awsebcli`
- AWS account with appropriate permissions

### Steps

1. **Initialize Elastic Beanstalk**
```bash
cd backend
eb init -p node.js-20 gemini-form-builder-api --region us-east-1
```

2. **Create Environment**
```bash
eb create production --instance-type t3.medium
```

3. **Configure Environment Variables**
```bash
eb setenv \
  NODE_ENV=production \
  JWT_SECRET=your-production-secret \
  AWS_REGION=us-east-1 \
  DYNAMODB_TABLE_PREFIX=prod-gemini-form-builder \
  GOOGLE_CLIENT_ID=your-google-id \
  GOOGLE_CLIENT_SECRET=your-google-secret \
  GITHUB_CLIENT_ID=your-github-id \
  GITHUB_CLIENT_SECRET=your-github-secret \
  FRONTEND_URL=https://yourfrontend.com
```

4. **Deploy**
```bash
npm run build
eb deploy
```

## Docker Deployment

### Build Docker Image

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/server.js"]
```

### Build and Run
```bash
npm run build
docker build -t gemini-form-builder-api .
docker run -p 3001:3001 --env-file .env gemini-form-builder-api
```

## Kubernetes Deployment

Create `k8s-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gemini-form-builder-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gemini-form-builder-api
  template:
    metadata:
      labels:
        app: gemini-form-builder-api
    spec:
      containers:
      - name: api
        image: your-registry/gemini-form-builder-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: "production"
        # Add other env vars from ConfigMap/Secret
---
apiVersion: v1
kind: Service
metadata:
  name: gemini-form-builder-api-service
spec:
  selector:
    app: gemini-form-builder-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3001
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f k8s-deployment.yaml
```

## Monitoring & Logging

### CloudWatch Integration
The application automatically logs to CloudWatch when running on AWS.

### Health Checks
Configure your load balancer to use:
- Health Check URL: `/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Healthy threshold: 2
- Unhealthy threshold: 3

### Metrics to Monitor
- API Response Time
- Error Rate (4xx, 5xx)
- DynamoDB Read/Write Capacity
- Lambda Concurrent Executions (if using serverless)
- Memory Usage
- CPU Usage

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (ALB/NLB)
- Auto-scaling based on CPU/Memory
- Minimum 2 instances for high availability

### DynamoDB Scaling
- Enable Auto Scaling for tables
- Set min/max capacity units
- Monitor consumed capacity

### Caching
Consider adding Redis for:
- Session storage
- ABAC policy caching
- Rate limiting

## Security Checklist

- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable CloudTrail for audit logs
- [ ] Configure VPC security groups
- [ ] Use HTTPS/TLS certificates
- [ ] Enable DynamoDB encryption
- [ ] Implement AWS WAF rules
- [ ] Set up CloudWatch alarms
- [ ] Regular security updates
- [ ] Implement backup strategy

## Backup & Disaster Recovery

### DynamoDB Backups
```bash
aws dynamodb create-backup --table-name prod-gemini-form-builder-users --backup-name users-backup-$(date +%Y%m%d)
```

Enable Point-in-Time Recovery:
```bash
aws dynamodb update-continuous-backups --table-name prod-gemini-form-builder-users --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

## Cost Optimization

1. **DynamoDB**
   - Use On-Demand pricing for variable workloads
   - Enable DynamoDB Auto Scaling
   - Archive old data to S3

2. **EC2/ECS**
   - Use Reserved Instances for predictable workloads
   - Implement auto-scaling policies
   - Use spot instances for non-critical tasks

3. **Monitoring**
   - Set up cost alerts
   - Review AWS Cost Explorer monthly
   - Optimize unused resources


