# Wedding Collaboration Documentation

eydn supports wedding collaboration, allowing couples and coordinators to work together on wedding planning through a secure invitation system.

## Overview

The collaboration system enables wedding owners to invite partners and professional coordinators to share access to their wedding planning. This feature supports modern wedding planning where multiple people need access to manage different aspects of the celebration.

## Collaboration Roles

### Owner
- **Full Access**: Complete control over all wedding data and settings
- **Invitation Management**: Can invite and remove collaborators
- **Subscription Management**: Controls premium features and billing
- **Final Authority**: Can override any changes made by collaborators

### Partner
- **Planning Access**: Full access to wedding planning features
- **Task Management**: Can create, update, and complete tasks
- **Vendor Management**: Can manage vendor pipeline and communications
- **Guest Management**: Can manage guest list and RSVPs
- **Budget Access**: Can view and update budget and expenses
- **Seating Charts**: Can create and modify seating arrangements
- **AI Assistant**: Can chat with eydn for planning guidance

### Coordinator
- **Professional Access**: Planning-focused access for wedding coordinators
- **Task Management**: Can create, update, and complete tasks
- **Vendor Management**: Can manage vendor pipeline and communications
- **Timeline Management**: Can create and update day-of timelines
- **Guest Coordination**: Can manage guest list and RSVPs
- **Day-of Planning**: Full access to ceremony and reception planning tools
- **Limited Settings**: Cannot modify core wedding details, subscription, or collaborator management

## Invitation Process

### Sending Invitations

1. **Owner Access Required**: Only wedding owners can send invitations
2. **Email-Based Invitations**: Collaborators are invited via email address
3. **Role Selection**: Owner chooses between "partner" or "coordinator" role
4. **Automatic Notifications**: Invitees receive email notifications (planned feature)

```typescript
// API Example: Invite a collaborator
POST /api/collaborators
{
  "email": "partner@example.com",
  "role": "partner"
}
```

### Accepting Invitations

1. **Account Creation**: Invitee creates eydn account with invited email
2. **Automatic Recognition**: System automatically matches email to pending invitation
3. **Auto-Accept**: Invitation automatically accepted and user_id populated
4. **Access Granted**: User gains immediate access to wedding planning
5. **Role Assignment**: User receives permissions based on assigned role
6. **Subscription Inheritance**: Collaborator inherits owner's premium status

### Invitation States

- **Pending**: Invitation sent but not yet accepted
- **Accepted**: User has joined and has active access
- **Expired**: Invitations expire after 30 days (planned feature)

## Technical Implementation

### Database Schema

```sql
create table wedding_collaborators (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  email text not null,
  role text not null check (role in ('partner', 'coordinator')),
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted')),
  invited_by text not null,  -- Clerk user ID of inviter
  user_id text,              -- Clerk user ID when accepted
  created_at timestamptz default now(),
  unique(wedding_id, email)
);
```

### Authorization Flow

```typescript
export async function getWeddingForUser(): Promise<AuthSuccess | AuthError> {
  const { userId } = await auth();
  
  // 1. Check if user owns the wedding
  const ownedWedding = await supabase
    .from("weddings")
    .select()
    .eq("user_id", userId)
    .single();
    
  if (ownedWedding) {
    return { wedding: ownedWedding, role: "owner", ... };
  }
  
  // 2. Check if user is an accepted collaborator
  const collaboration = await supabase
    .from("wedding_collaborators")
    .select("wedding_id, role")
    .eq("user_id", userId)
    .eq("invite_status", "accepted")
    .single();
    
  if (collaboration) {
    const wedding = await getWeddingById(collaboration.wedding_id);
    return { wedding, role: collaboration.role, ... };
  }
  
  // 3. Check for pending invitation auto-accept
  const pendingInvite = await supabase
    .from("wedding_collaborators")
    .select("wedding_id, role")
    .eq("email", userEmail)
    .eq("invite_status", "pending")
    .single();
    
  if (pendingInvite) {
    // Auto-accept and grant access
    await acceptInvitation(pendingInvite.id, userId);
    const wedding = await getWeddingById(pendingInvite.wedding_id);
    return { wedding, role: pendingInvite.role, ... };
  }
  
  return { error: "No wedding access found" };
}
```

## Feature Access Control

### Owner-Only Features
- **Collaborator Management**: Invite, remove, and manage collaborators
- **Subscription Management**: Upgrade, downgrade, and billing
- **Wedding Deletion**: Permanently delete wedding data
- **Core Settings**: Wedding date, venue, basic details

### Shared Features (All Roles)
- **Task Management**: Create, update, complete tasks with comments
- **Vendor Pipeline**: Manage vendor relationships and communications
- **Guest Management**: Manage guest list, RSVPs, and seating charts
- **Budget Tracking**: View and update expenses and budget (Owner + Partner only)
- **AI Assistant**: Chat with eydn for planning guidance (premium feature)
- **Day-of Planning**: Create and update day-of timelines
- **Mood Board**: Add and organize wedding inspiration
- **File Uploads**: Upload and manage wedding documents (premium feature)
- **Comments**: Collaborate on tasks, vendors, and other entities

### Role-Based Restrictions

```typescript
// Example: Restrict collaborator management to owners
if (role !== "owner") {
  return NextResponse.json(
    { error: "Only the wedding owner can manage collaborators" }, 
    { status: 403 }
  );
}
```

## User Experience

### Dashboard Integration

Collaborators see the same dashboard interface as owners, with appropriate restrictions:

- **Navigation**: Full access to planning sections
- **Settings**: Limited access to core wedding settings
- **Collaborators**: Cannot see collaborator management (non-owners)
- **Billing**: No access to subscription or billing features

### Visual Indicators

- **Role Display**: User's role shown in dashboard header
- **Permission Hints**: Disabled features show helpful tooltips
- **Owner Actions**: Clear indication of owner-only features

## Security Considerations

### Access Control
- **Email Verification**: Invitations tied to specific email addresses
- **Role Enforcement**: Server-side role checking on all API routes
- **Audit Trail**: All collaborator actions logged with user attribution
- **Automatic Cleanup**: Removed collaborators lose access immediately

### Data Protection
- **Scoped Access**: Collaborators can only access invited wedding data
- **No Cross-Wedding Access**: Cannot access other weddings
- **Secure Invitations**: Invitation tokens prevent unauthorized access
- **Role Limitations**: Coordinators cannot modify core wedding details

## API Endpoints

### Collaborator Management

```typescript
// Get all collaborators (owner only)
GET /api/collaborators
Response: Array<{
  id: string;
  email: string;
  role: "partner" | "coordinator";
  invite_status: "pending" | "accepted";
  user_id?: string;
  created_at: string;
}>

// Invite collaborator (owner only)
POST /api/collaborators
Body: {
  email: string;
  role: "partner" | "coordinator";
}

// Remove collaborator (owner only)
DELETE /api/collaborators/[id]
```

### Authorization Check

```typescript
// All protected routes use this pattern
const result = await getWeddingForUser();
if ("error" in result) return result.error;

const { wedding, role, userId } = result;
// Use role for feature-specific restrictions
```

## Future Enhancements

### Planned Features
- **Email Notifications**: Automatic invitation and activity emails
- **Activity Feed**: Real-time collaboration activity tracking
- **Permission Granularity**: More specific role-based permissions
- **Invitation Expiration**: Time-limited invitation links
- **Bulk Invitations**: Invite multiple collaborators at once

### Advanced Collaboration
- **Comments System**: Collaborate on specific tasks and vendors
- **Assignment System**: Assign specific tasks to collaborators
- **Approval Workflows**: Require owner approval for major changes
- **Real-time Updates**: Live collaboration with real-time sync

## Best Practices

### For Wedding Owners
1. **Clear Role Assignment**: Choose appropriate roles for each collaborator
2. **Regular Review**: Periodically review active collaborators
3. **Communication**: Establish clear responsibilities and boundaries
4. **Security**: Remove access when collaboration ends

### For Collaborators
1. **Respect Boundaries**: Stay within assigned role permissions
2. **Communication**: Coordinate changes with other collaborators
3. **Documentation**: Leave clear notes on changes and decisions
4. **Professional Conduct**: Maintain professional standards for coordinators

The collaboration system enables seamless teamwork while maintaining security and clear role boundaries, making wedding planning more efficient and enjoyable for everyone involved.