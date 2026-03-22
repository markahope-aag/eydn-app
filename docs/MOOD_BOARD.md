# Mood Board Documentation

The eydn mood board feature allows couples to collect, organize, and share visual inspiration for their wedding planning. This digital inspiration board helps couples communicate their vision to vendors and maintain design consistency throughout their planning process.

## Overview

The mood board serves as a centralized visual reference for wedding style, colors, themes, and inspiration. Couples can add images, organize them by category, and use them to guide vendor conversations and decision-making.

## Key Features

### Visual Organization
- **Image Collection**: Add images from URLs or upload files
- **Categorization**: Organize images by wedding elements (venue, flowers, dress, etc.)
- **Custom Captions**: Add descriptive text to each image
- **Drag & Drop Sorting**: Reorder images by importance or preference

### Collaboration
- **Shared Access**: Partners and coordinators can contribute to the mood board
- **Real-time Updates**: Changes appear immediately for all collaborators
- **Version History**: Track changes and additions over time

### Integration
- **Vendor Sharing**: Share mood board with vendors for alignment
- **Task Integration**: Link mood board items to specific planning tasks
- **Style Consistency**: Reference mood board throughout planning process

## Technical Implementation

### Database Schema

```sql
create table mood_board_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings(id) on delete cascade,
  image_url text not null,
  caption text,
  category text not null default 'General',
  sort_order integer not null default 0,
  created_at timestamptz default now()
);
```

### API Endpoints

#### Get Mood Board Items
```typescript
GET /api/mood-board

Response: Array<{
  id: string;
  wedding_id: string;
  image_url: string;
  caption?: string;
  category: string;
  sort_order: number;
  created_at: string;
}>
```

#### Add Mood Board Item
```typescript
POST /api/mood-board

Body: {
  image_url: string;
  caption?: string;
  category?: string; // Defaults to "General"
}

Response: {
  id: string;
  wedding_id: string;
  image_url: string;
  caption?: string;
  category: string;
  sort_order: number;
  created_at: string;
}
```

#### Update Mood Board Item
```typescript
PATCH /api/mood-board/[id]

Allowed Fields:
- caption: string
- category: string  
- sort_order: number

Body: {
  caption?: string;
  category?: string;
  sort_order?: number;
}
```

#### Delete Mood Board Item
```typescript
DELETE /api/mood-board/[id]
```

## Categories

### Default Categories
- **General**: Miscellaneous inspiration
- **Venue**: Reception and ceremony spaces
- **Flowers**: Bouquets, centerpieces, and floral arrangements
- **Dress**: Wedding dress and attire inspiration
- **Decor**: Table settings, lighting, and decorative elements
- **Colors**: Color palette and scheme inspiration
- **Cake**: Wedding cake and dessert ideas
- **Photography**: Photo style and pose inspiration

### Custom Categories
- Couples can create custom categories for specific needs
- Categories help organize large collections of inspiration
- Vendors can filter by relevant categories

## User Interface

### Grid Layout
- **Responsive Grid**: Adapts to different screen sizes
- **Image Thumbnails**: Optimized loading with lazy loading
- **Hover Effects**: Show captions and actions on hover
- **Full-Screen View**: Click to view images in full resolution

### Sorting and Filtering
- **Category Filters**: Show only specific categories
- **Sort Options**: By date added, category, or custom order
- **Search**: Find images by caption or category
- **Bulk Actions**: Select multiple items for batch operations

### Adding Content
- **URL Input**: Paste image URLs from Pinterest, Instagram, etc.
- **File Upload**: Upload images directly from device
- **Drag & Drop**: Drag images directly onto the mood board
- **Browser Extension**: Save images while browsing (planned)

## Workflow Integration

### Planning Process
1. **Early Inspiration**: Collect initial style ideas and preferences
2. **Vendor Meetings**: Share relevant mood board sections with vendors
3. **Decision Making**: Reference mood board when making style choices
4. **Consistency Check**: Ensure all decisions align with overall vision

### Vendor Collaboration
- **Style Communication**: Visual reference eliminates miscommunication
- **Proposal Alignment**: Vendors can match their proposals to mood board
- **Feedback Loop**: Vendors can suggest additions to mood board
- **Contract Reference**: Include mood board references in vendor contracts

## Best Practices

### Content Curation
- **Quality over Quantity**: Focus on images that truly inspire
- **Consistent Style**: Maintain cohesive aesthetic across images
- **Detailed Captions**: Add context and specific details to images
- **Regular Review**: Remove outdated or irrelevant inspiration

### Organization
- **Logical Categories**: Use categories that match your planning process
- **Priority Ordering**: Place most important inspiration first
- **Seasonal Considerations**: Account for wedding season in selections
- **Budget Awareness**: Include realistic inspiration within budget range

### Collaboration
- **Partner Input**: Ensure both partners contribute to mood board
- **Professional Guidance**: Include coordinator input on feasibility
- **Vendor Feedback**: Listen to vendor suggestions and constraints
- **Guest Consideration**: Consider guest experience in style choices

## Advanced Features

### Planned Enhancements
- **Color Extraction**: Automatically extract color palettes from images
- **Style Analysis**: AI-powered style consistency analysis
- **Vendor Matching**: Suggest vendors based on mood board style
- **Budget Integration**: Link inspiration to budget categories
- **Social Integration**: Import from Pinterest, Instagram, etc.

### Professional Features
- **Client Sharing**: Coordinators can share mood boards with clients
- **Vendor Presentations**: Create presentations using mood board content
- **Style Guides**: Generate comprehensive style guides from mood board
- **Trend Analysis**: Track popular styles and trends

## Technical Considerations

### Performance
- **Image Optimization**: Automatic image compression and resizing
- **Lazy Loading**: Load images as they come into view
- **CDN Integration**: Fast image delivery via content delivery network
- **Caching**: Browser caching for frequently viewed images

### Storage
- **Cloud Storage**: Images stored in Supabase storage
- **Backup**: Automatic backup of all mood board content
- **Version Control**: Track changes and maintain history
- **Cleanup**: Automatic cleanup of unused images

### Security
- **Access Control**: Only wedding collaborators can view mood board
- **Copyright Awareness**: Guidelines for using copyrighted images
- **Privacy**: Private mood boards not indexed by search engines
- **Data Protection**: GDPR-compliant image handling

## Integration Points

### Dashboard Integration
- **Quick Access**: Mood board accessible from main dashboard
- **Recent Activity**: Show recently added mood board items
- **Task Links**: Connect mood board items to relevant tasks
- **Progress Tracking**: Track mood board completion status

### Vendor Integration
- **Sharing Links**: Generate secure links for vendor access
- **Category Filtering**: Vendors see only relevant categories
- **Feedback System**: Vendors can comment on mood board items
- **Proposal Integration**: Reference mood board in vendor proposals

### Mobile Experience
- **Responsive Design**: Full functionality on mobile devices
- **Touch Gestures**: Swipe and pinch gestures for navigation
- **Offline Access**: Cache mood board for offline viewing
- **Photo Capture**: Add photos directly from mobile camera

The mood board feature enhances the wedding planning experience by providing a visual foundation for all style decisions, improving communication with vendors, and ensuring design consistency throughout the planning process.