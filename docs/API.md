# eydn API Documentation

This document provides a comprehensive overview of all API endpoints in the eydn wedding planning platform.

## Authentication

All API routes (except public and webhook endpoints) require authentication via Clerk. The API uses the `getWeddingForUser()` helper with role-based access control and premium feature enforcement.

### Access Roles

- **Owner**: Full access to all wedding data, settings, and collaborator management
- **Partner**: Collaborative access to wedding planning (invited by owner)
- **Coordinator**: Professional planning access (invited by owner, limited settings access)

### Premium Features

The following endpoints require premium access (active subscription or trial):
- `POST /api/chat` - AI wedding assistant
- `POST /api/attachments` - File uploads
- `GET /api/day-of` (PDF export) - Day-of planning PDF generation

### Authorization Pattern

```typescript
const result = await getWeddingForUser();
if ("error" in result) return result.error;
const { wedding, supabase, userId, role } = result;

// Role-based restrictions
if (role !== "owner") {
  return NextResponse.json({ error: "Owner access required" }, { status: 403 });
}

// Premium feature protection
const premiumCheck = await requirePremium();
if (premiumCheck) return premiumCheck; // Returns 403 if no access
```

### Headers
```
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
X-Rate-Limit: Enforced via Upstash Redis
```

### Rate Limiting

All API endpoints are protected by rate limiting:
- **General endpoints**: 100 requests per minute per user
- **AI chat endpoint**: 10 requests per minute per user
- **File upload endpoint**: 5 requests per minute per user

## Core Resources

### Weddings

#### `GET /api/weddings`
Get the current user's wedding information.

**Response:**
```json
{
  "id": "uuid",
  "user_id": "string",
  "partner_name_1": "string",
  "partner_name_2": "string",
  "wedding_date": "2024-06-15",
  "venue": "string",
  "guest_count": 150,
  "budget": 25000,
  "style": "romantic",
  "created_at": "2024-01-01T00:00:00Z"
}
```

#### `PATCH /api/weddings/[id]`
Update wedding information (restricted fields only).

**Request Body:**
```json
{
  "partner1_name": "string",
  "partner2_name": "string",
  "date": "2024-06-15",
  "venue": "string",
  "guest_count": 150,
  "budget": 25000,
  "style": "romantic",
  "location": "New York, NY"
}
```

**Note:** Only specific fields are allowed for updates. The API uses field validation to prevent unauthorized modifications.

### Tasks

#### `GET /api/tasks`
Get all tasks for the user's wedding.

**Query Parameters:**
- `category` (optional): Filter by task category
- `status` (optional): Filter by completion status
- `overdue` (optional): Filter overdue tasks

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Book venue",
    "description": "Find and book the perfect venue",
    "category": "venue",
    "due_date": "2024-02-15",
    "completed": false,
    "priority": "high",
    "edyn_message": "Time to find your perfect backdrop!",
    "resources": ["url1", "url2"]
  }
]
```

#### `POST /api/tasks`
Create a new task.

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "due_date": "2024-02-15",
  "priority": "high|medium|low"
}
```

#### `PUT /api/tasks/[id]`
Update a task.

#### `DELETE /api/tasks/[id]`
Delete a task.

#### `GET /api/tasks/[id]/related`
Get related tasks for a specific task.

#### `GET /api/tasks/[id]/resources`
Get resources/attachments for a task.

### Vendors

#### `GET /api/vendors`
Get all vendors for the user's wedding.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Amazing Photography",
    "category": "photographer",
    "status": "contacted",
    "contact_name": "John Smith",
    "email": "john@amazingphoto.com",
    "phone": "+1234567890",
    "website": "https://amazingphoto.com",
    "notes": "Specializes in outdoor weddings",
    "estimated_cost": 3000
  }
]
```

#### `POST /api/vendors`
Add a new vendor.

#### `PUT /api/vendors/[id]`
Update vendor information.

#### `DELETE /api/vendors/[id]`
Remove a vendor.

### Budget & Expenses

#### `GET /api/expenses`
Get all expenses for the wedding.

**Response:**
```json
[
  {
    "id": "uuid",
    "category": "venue",
    "vendor_name": "Grand Ballroom",
    "description": "Venue rental",
    "amount": 5000,
    "paid": true,
    "due_date": "2024-03-01"
  }
]
```

#### `POST /api/expenses`
Add a new expense.

#### `PUT /api/expenses/[id]`
Update an expense.

#### `DELETE /api/expenses/[id]`
Delete an expense.

### Guests

#### `GET /api/guests`
Get the guest list.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "rsvp_status": "pending",
    "meal_preference": "vegetarian",
    "plus_one": true,
    "plus_one_name": "John Doe",
    "table_assignment": 5
  }
]
```

#### `POST /api/guests`
Add a new guest.

#### `POST /api/guests/import`
Import guests from CSV file.

**Request Body:**
```json
{
  "csv_data": "name,email,phone\nJane Doe,jane@example.com,+1234567890"
}
```

#### `PUT /api/guests/[id]`
Update guest information.

#### `DELETE /api/guests/[id]`
Remove a guest.

### Wedding Party

#### `GET /api/wedding-party`
Get wedding party members.

#### `POST /api/wedding-party`
Add a wedding party member.

#### `PUT /api/wedding-party/[id]`
Update wedding party member.

#### `DELETE /api/wedding-party/[id]`
Remove wedding party member.

### Wedding Collaborators

#### `GET /api/collaborators`
Get wedding collaborators and invitations (owner only).

**Response:**
```json
[
  {
    "id": "uuid",
    "wedding_id": "uuid",
    "email": "partner@example.com",
    "role": "partner",
    "invite_status": "pending",
    "user_id": null,
    "invited_by": "user_123",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /api/collaborators`
Invite a wedding collaborator (owner only).

**Request Body:**
```json
{
  "email": "partner@example.com",
  "role": "partner"
}
```

**Roles:**
- `partner` - Wedding partner with full planning access
- `coordinator` - Wedding coordinator with professional planning access (limited settings)

**Auto-Accept Flow:**
- When invited user signs up with matching email, invitation is automatically accepted
- User gains immediate access to wedding planning with assigned role

#### `DELETE /api/collaborators/[id]`
Remove a collaborator invitation (owner only).

**Note:** Removing a collaborator immediately revokes their access to the wedding.

### Mood Board

#### `GET /api/mood-board`
Get all mood board items for the wedding.

**Response:**
```json
[
  {
    "id": "uuid",
    "wedding_id": "uuid",
    "image_url": "https://example.com/image.jpg",
    "caption": "Beautiful venue inspiration",
    "category": "Venue",
    "sort_order": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /api/mood-board`
Add a new mood board item.

**Request Body:**
```json
{
  "image_url": "https://example.com/image.jpg",
  "caption": "Beautiful venue inspiration",
  "category": "Venue"
}
```

#### `PATCH /api/mood-board/[id]`
Update a mood board item.

**Allowed Fields:**
- `caption` - Update the caption
- `category` - Update the category
- `sort_order` - Update the sort order

#### `DELETE /api/mood-board/[id]`
Remove a mood board item.

### Comments

#### `GET /api/comments`
Get comments for wedding entities.

**Query Parameters:**
- `entity_type` - Filter by entity type (task, vendor, guest, expense, general)
- `entity_id` - Filter by specific entity ID

**Response:**
```json
[
  {
    "id": "uuid",
    "wedding_id": "uuid",
    "entity_type": "task",
    "entity_id": "task_uuid",
    "user_id": "user_123",
    "user_name": "John Doe",
    "content": "This task needs to be completed by next week",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

#### `POST /api/comments`
Add a comment to a wedding entity.

**Request Body:**
```json
{
  "entity_type": "task",
  "entity_id": "task_uuid",
  "content": "This task needs to be completed by next week"
}
```

**Entity Types:**
- `task` - Comments on specific tasks
- `vendor` - Comments on vendor entries
- `guest` - Comments on guest entries
- `expense` - Comments on budget items
- `general` - General wedding comments

### Seating

#### `GET /api/seating/tables`
Get all tables and seating arrangements.

#### `POST /api/seating/tables`
Create a new table.

#### `PUT /api/seating/tables/[id]`
Update table information.

#### `DELETE /api/seating/tables/[id]`
Delete a table.

#### `GET /api/seating/assignments`
Get guest seating assignments.

#### `POST /api/seating/assignments`
Create or update seating assignments.

## AI & Chat

### Chat

#### `POST /api/chat`
Send a message to the AI wedding planner.

**Request Body:**
```json
{
  "message": "What should I do first for my wedding planning?",
  "context": {
    "wedding_date": "2024-06-15",
    "guest_count": 150,
    "budget": 25000
  }
}
```

**Response:**
```json
{
  "response": "Hi! I'm eydn, your wedding guide. Based on your June wedding, let's start with...",
  "suggestions": ["Book venue", "Set budget", "Create guest list"]
}
```

## Onboarding & Setup

### Onboarding

#### `POST /api/onboarding`
Complete the initial wedding setup.

**Request Body:**
```json
{
  "partner_name_1": "string",
  "partner_name_2": "string",
  "wedding_date": "2024-06-15",
  "venue": "string",
  "guest_count": 150,
  "budget": 25000,
  "style": "romantic"
}
```

### Questionnaire

#### `POST /api/questionnaire`
Submit onboarding questionnaire responses.

**Request Body:**
```json
{
  "responses": {
    "dream_wedding": "Romantic garden party",
    "priorities": ["photography", "food", "music"],
    "vendors_booked": ["venue", "photographer"]
  }
}
```

## Day-of Planning

### Day-of Timeline

#### `GET /api/day-of`
Get the day-of timeline and coordination details.

#### `POST /api/day-of`
Create or update day-of timeline.

### Ceremony

#### `GET /api/ceremony`
Get ceremony details and timeline.

#### `POST /api/ceremony`
Update ceremony information.

## Wedding Website (Public)

### Public Wedding Site

#### `GET /api/wedding-website`
Get public wedding website data.

#### `PUT /api/wedding-website`
Update wedding website settings.

#### `GET /api/wedding-website/photos`
Get wedding photos for public display.

#### `POST /api/wedding-website/photos`
Upload wedding photos.

#### `GET /api/wedding-website/registry`
Get registry information.

#### `POST /api/wedding-website/registry`
Update registry details.

#### `GET /api/wedding-website/rsvp`
Get RSVP tokens and management (authenticated).

#### `POST /api/wedding-website/rsvp`
Create or update RSVP tokens for guests (authenticated).

### Public RSVP

#### `POST /api/public/rsvp`
Submit RSVP from public wedding website using token.

**Request Body:**
```json
{
  "token": "rsvp_token_string",
  "rsvp_status": "accepted",
  "meal_preference": "vegetarian",
  "plus_one_name": "John Doe"
}
```

**Note:** Uses token-based authentication instead of guest_id for security.

#### `GET /api/public/photos`
Get public wedding photos.

## Vendor Ecosystem

### Suggested Vendors

#### `GET /api/suggested-vendors`
Get suggested vendors by category and location.

**Query Parameters:**
- `category`: Vendor category (required)
- `location`: Wedding location
- `budget`: Budget range

### Vendor Submissions

#### `POST /api/vendor-submissions`
Submit a vendor for inclusion in the directory.

### Vendor Portal

#### `GET /api/vendor-portal/account`
Get vendor account information.

#### `PUT /api/vendor-portal/account`
Update vendor account.

#### `GET /api/vendor-portal/analytics`
Get vendor performance analytics.

#### `GET /api/vendor-portal/placements`
Get current vendor placements.

#### `POST /api/vendor-portal/checkout`
Purchase vendor placement.

#### `GET /api/vendor-portal/tiers`
Get available placement tiers.

## Subscription & Billing

### Subscription

#### `GET /api/subscription-status`
Get current subscription status.

**Response:**
```json
{
  "status": "trial",
  "trial_ends_at": "2024-02-15T00:00:00Z",
  "is_premium": false,
  "days_remaining": 10
}
```

#### `POST /api/subscribe`
Create Stripe checkout session for subscription.

### Webhooks

#### `POST /api/webhooks/stripe`
Handle Stripe webhook events for payment processing.

## Admin Endpoints

All admin endpoints require admin privileges (`isAdmin()` check).

### Admin Stats

#### `GET /api/admin/stats`
Get platform statistics and metrics.

### Admin Users

#### `GET /api/admin/users`
Get all platform users.

### Admin Vendor Management

#### `GET /api/admin/vendor-accounts`
Get all vendor accounts.

#### `GET /api/admin/vendor-submissions`
Get pending vendor submissions.

#### `PUT /api/admin/vendor-submissions/[id]`
Approve or reject vendor submission.

#### `GET /api/admin/suggested-vendors`
Manage suggested vendor directory.

#### `POST /api/admin/suggested-vendors`
Add vendor to suggested directory.

#### `PUT /api/admin/suggested-vendors/[id]`
Update suggested vendor.

#### `DELETE /api/admin/suggested-vendors/[id]`
Remove suggested vendor.

### Admin Placements

#### `GET /api/admin/placements`
Get all vendor placements.

#### `GET /api/admin/placement-tiers`
Get placement tier configuration.

#### `POST /api/admin/placement-tiers`
Create new placement tier.

### Admin Settings

#### `GET /api/admin/settings`
Get platform settings.

#### `PUT /api/admin/settings`
Update platform settings.

#### `GET /api/admin/events`
Get platform events and logs.

#### `POST /api/admin/setup`
Initialize admin configuration.

## Utilities

### Notifications

#### `GET /api/notifications`
Get user notifications.

#### `POST /api/notifications`
Mark notifications as read.

### Attachments

#### `POST /api/attachments`
Upload file attachments.

**Request:** Multipart form data with file

**Response:**
```json
{
  "url": "https://storage.url/file.pdf",
  "filename": "contract.pdf",
  "size": 1024000
}
```

### Settings

#### `GET /api/settings`
Get user settings and preferences.

#### `PUT /api/settings`
Update user settings.

## Cron Jobs

### Deadline Checker

#### `POST /api/cron/check-deadlines`
Automated endpoint to check for upcoming deadlines and send notifications.

**Note:** This endpoint is called by Vercel Cron and requires proper authentication.

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Premium Feature Protection

Certain API endpoints require premium access (paid subscription or active trial):

- **AI Chat** (`/api/chat`) - Requires `requirePremium()` check
- **File Attachments** (`/api/attachments`) - Requires `requirePremium()` check
- **PDF Export** - Premium feature in day-of planner

### Premium Enforcement

```typescript
const premiumCheck = await requirePremium();
if (premiumCheck) return premiumCheck; // Returns 403 if no access
```

## Webhooks

### Stripe Webhooks

The platform handles the following Stripe webhook events:

- `checkout.session.completed` - Process successful payments
- `invoice.payment_succeeded` - Handle subscription renewals
- `invoice.payment_failed` - Handle failed payments
- `customer.subscription.deleted` - Handle subscription cancellations

Webhook endpoint: `POST /api/webhooks/stripe`

**Security:** All webhooks are verified using Stripe's signature verification.