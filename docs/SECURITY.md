# Security & Compliance Documentation

This document outlines the comprehensive security measures, compliance standards, and best practices implemented in the eydn wedding planning platform.

## Security Overview

eydn implements defense-in-depth security architecture with multiple layers of protection to ensure user data privacy, system integrity, and regulatory compliance.

### Security Principles

- **Zero Trust Architecture**: Every request is authenticated and authorized
- **Principle of Least Privilege**: Users and systems have minimal required access
- **Data Minimization**: Only necessary data is collected and stored
- **Encryption Everywhere**: Data encrypted in transit and at rest
- **Audit Everything**: Comprehensive logging and monitoring

## Authentication & Authorization

### Multi-Factor Authentication

#### Clerk Integration
- **Provider**: Clerk 7.0.5 with enterprise-grade security
- **Methods**: Email/password, Google OAuth, magic links
- **Session Management**: Secure JWT tokens with automatic refresh
- **Device Management**: Multi-device session tracking and management

#### Authentication Flow
```
User Request → Clerk Middleware → Session Validation → API Authorization
```

### Role-Based Access Control (RBAC)

#### Access Roles
- **Owner**: Full access to wedding data and settings
- **Partner**: Collaborative planning access (invited by owner)
- **Coordinator**: Professional planning access with limited settings

#### Authorization Implementation
```typescript
export async function getWeddingForUser(): Promise<AuthSuccess | AuthError> {
  // 1. Validate Clerk session
  // 2. Check direct ownership
  // 3. Check accepted collaborator status
  // 4. Auto-accept pending invitations
  // 5. Return role-based access
}
```

#### Permission Matrix

| Feature | Owner | Partner | Coordinator |
|---------|-------|---------|-------------|
| Wedding Settings | ✅ | ❌ | ❌ |
| Collaborator Management | ✅ | ❌ | ❌ |
| Subscription Management | ✅ | ❌ | ❌ |
| Task Management | ✅ | ✅ | ✅ |
| Vendor Management | ✅ | ✅ | ✅ |
| Guest Management | ✅ | ✅ | ✅ |
| Budget Management | ✅ | ✅ | ❌ |
| AI Chat (Premium) | ✅ | ✅ | ✅ |

## Data Protection

### Encryption

#### Data in Transit
- **TLS 1.3**: All communications encrypted with latest TLS
- **HSTS**: HTTP Strict Transport Security enforced
- **Certificate Pinning**: SSL certificate validation
- **Perfect Forward Secrecy**: Session keys cannot be compromised retroactively

#### Data at Rest
- **Database**: Supabase provides AES-256 encryption at rest
- **File Storage**: Supabase Storage with encrypted object storage
- **Backups**: Encrypted automated backups with point-in-time recovery
- **Secrets**: Environment variables encrypted in Vercel

### Data Isolation

#### Row Level Security (RLS)
All database tables implement RLS policies:

```sql
-- Example: Users can only access their wedding data
create policy "Users can manage their own weddings"
  on public.weddings for all
  using (user_id = current_setting('request.jwt.claim.sub', true));

-- Example: Collaborators can access shared weddings
create policy "Collaborators can access shared weddings"
  on public.tasks for all
  using (
    wedding_id in (
      select wedding_id from wedding_collaborators 
      where user_id = current_setting('request.jwt.claim.sub', true)
      and invite_status = 'accepted'
    )
  );
```

#### Multi-Tenant Architecture
- **Wedding Isolation**: Each wedding's data is completely isolated
- **User Scoping**: All queries scoped to authenticated user
- **Cross-Wedding Protection**: No access to other weddings' data
- **Admin Separation**: Admin functions isolated from user data

## API Security

### Rate Limiting

#### Upstash Redis Implementation
- **General Endpoints**: 100 requests per minute per user
- **AI Chat**: 10 requests per minute per user
- **File Uploads**: 5 requests per minute per user
- **Authentication**: 20 requests per minute per IP

#### Rate Limiting Strategy
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
});

export async function rateLimitCheck(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  return { success, limit, reset, remaining };
}
```

### Input Validation & Sanitization

#### Field Validation Pattern
```typescript
import { pickFields } from '@/lib/validation';

// Only allow specific fields to be updated
const allowedFields = ['partner1_name', 'partner2_name', 'date', 'venue'];
const updateData = pickFields(requestBody, allowedFields);
```

#### Validation Rules
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and output encoding
- **CSRF Protection**: Built-in Next.js CSRF protection
- **File Upload Validation**: Type, size, and content validation

### Premium Feature Protection

#### Server-Side Enforcement
```typescript
export async function requirePremium(): Promise<NextResponse | null> {
  const status = await getSubscriptionStatus();
  if (status.hasAccess) return null;
  
  return NextResponse.json(
    { error: "Premium feature — upgrade to continue" },
    { status: 403 }
  );
}
```

#### Protected Endpoints
- `POST /api/chat` - AI wedding assistant
- `POST /api/attachments` - File uploads
- `GET /api/day-of` (PDF export) - Day-of planning documents

## Security Headers

### Next.js Security Configuration

```typescript
// next.config.ts
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ];
}
```

### Content Security Policy (CSP)
- **Script Sources**: Only trusted domains allowed
- **Style Sources**: Inline styles restricted
- **Image Sources**: Whitelisted domains for external images
- **Frame Ancestors**: Prevent clickjacking attacks

## Audit & Monitoring

### Activity Logging

#### Comprehensive Audit Trail
```sql
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id text not null,
  action text not null,                     -- create, update, delete, restore
  entity_type text not null,
  entity_id text not null,
  entity_name text,
  details jsonb,
  created_at timestamptz not null default now()
);
```

#### Logged Actions
- **Data Changes**: All create, update, delete operations
- **Authentication Events**: Login, logout, session changes
- **Collaboration**: Invitations sent, accepted, removed
- **Premium Features**: Subscription changes, feature usage
- **Security Events**: Failed authentication, rate limiting

### Error Monitoring

#### Structured Logging
```typescript
// Standardized logging format
console.log('[API] Processing request', {
  endpoint: '/api/tasks',
  userId,
  method: 'POST',
  timestamp: new Date().toISOString()
});

console.error('[ERROR] Database operation failed', {
  error: error.message,
  stack: error.stack,
  userId,
  operation: 'createTask'
});
```

#### Monitoring Stack
- **Application Monitoring**: Vercel Analytics and logging
- **Database Monitoring**: Supabase dashboard and alerts
- **Error Tracking**: Built-in error boundaries and logging
- **Performance Monitoring**: Core Web Vitals and API response times

## Compliance

### Data Privacy Regulations

#### GDPR Compliance
- **Lawful Basis**: Legitimate interest for wedding planning services
- **Data Minimization**: Only necessary data collected
- **Right to Access**: Users can export all their data
- **Right to Deletion**: Soft deletes with permanent deletion option
- **Data Portability**: Export functionality for all user data
- **Privacy by Design**: Built-in privacy protections

#### CCPA Compliance
- **Transparency**: Clear privacy policy and data usage
- **Consumer Rights**: Access, deletion, and opt-out rights
- **Data Categories**: Clear categorization of collected data
- **Third-Party Sharing**: Limited to essential service providers

### Payment Card Industry (PCI)

#### PCI DSS Compliance
- **Stripe Integration**: PCI Level 1 compliant payment processor
- **No Card Storage**: No payment card data stored on eydn servers
- **Secure Transmission**: All payment data encrypted in transit
- **Tokenization**: Stripe tokens used instead of card data

### SOC 2 Considerations

#### Security Controls
- **Access Controls**: Role-based access with audit trails
- **System Monitoring**: Comprehensive logging and alerting
- **Data Protection**: Encryption and secure data handling
- **Incident Response**: Documented procedures for security incidents

## Vulnerability Management

### Security Auditing

#### Automated Security Scanning
```bash
# Regular security audits
npm run audit              # Check for known vulnerabilities
npm run security-check     # Comprehensive security validation
```

#### Dependency Management
- **Regular Updates**: Monthly dependency updates
- **Vulnerability Scanning**: Automated scanning for known issues
- **Security Patches**: Immediate application of security patches
- **Supply Chain Security**: Verification of package integrity

### Penetration Testing

#### Regular Security Assessment
- **Quarterly Reviews**: Professional security assessments
- **Automated Scanning**: Continuous vulnerability scanning
- **Code Reviews**: Security-focused code review process
- **Third-Party Audits**: Annual third-party security audits

## Incident Response

### Security Incident Procedures

#### Incident Classification
- **Critical**: Data breach, system compromise
- **High**: Authentication bypass, privilege escalation
- **Medium**: Denial of service, information disclosure
- **Low**: Configuration issues, minor vulnerabilities

#### Response Process
1. **Detection**: Automated monitoring and manual reporting
2. **Assessment**: Severity classification and impact analysis
3. **Containment**: Immediate steps to limit damage
4. **Investigation**: Root cause analysis and evidence collection
5. **Recovery**: System restoration and security improvements
6. **Communication**: User notification and regulatory reporting

### Backup & Recovery

#### Data Backup Strategy
- **Automated Backups**: Daily automated database backups
- **Point-in-Time Recovery**: Restore to any point within 30 days
- **Geographic Distribution**: Backups stored in multiple regions
- **Backup Encryption**: All backups encrypted at rest
- **Recovery Testing**: Monthly backup restoration testing

#### Business Continuity
- **High Availability**: 99.9% uptime SLA with Vercel and Supabase
- **Disaster Recovery**: Documented procedures for major incidents
- **Failover Systems**: Automatic failover for critical components
- **Communication Plan**: User communication during outages

## Security Best Practices

### Development Security

#### Secure Coding Standards
- **Input Validation**: All inputs validated and sanitized
- **Output Encoding**: All outputs properly encoded
- **Error Handling**: Secure error messages without information disclosure
- **Secret Management**: No hardcoded secrets or credentials

#### Code Review Process
- **Security Reviews**: Security-focused code reviews
- **Automated Testing**: Security tests in CI/CD pipeline
- **Static Analysis**: Automated code security scanning
- **Dependency Checks**: Regular dependency vulnerability scanning

### Operational Security

#### Access Management
- **Principle of Least Privilege**: Minimal required access
- **Regular Access Reviews**: Quarterly access audits
- **Strong Authentication**: Multi-factor authentication required
- **Session Management**: Secure session handling and timeout

#### Infrastructure Security
- **Network Security**: Firewall rules and network segmentation
- **Server Hardening**: Secure server configurations
- **Patch Management**: Regular security updates
- **Monitoring**: Continuous security monitoring and alerting

## Contact Information

### Security Team
- **Security Issues**: security@eydn.com
- **Vulnerability Reports**: security@eydn.com
- **Emergency Contact**: Available 24/7 for critical security issues

### Responsible Disclosure
We encourage responsible disclosure of security vulnerabilities:
1. Report vulnerabilities to security@eydn.com
2. Provide detailed information about the vulnerability
3. Allow reasonable time for investigation and remediation
4. Do not access or modify user data without permission

This security documentation is regularly updated to reflect the latest security measures and compliance requirements. For questions or concerns about security, please contact our security team.