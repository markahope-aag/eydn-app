# Wedding Websites Documentation

eydn provides couples with beautiful, customizable wedding websites that serve as the central hub for guest information, RSVPs, and wedding details.

## Overview

Every couple using eydn can create a public wedding website accessible at `https://eydn.com/w/[slug]`. These sites are mobile-optimized, fast-loading, and designed to provide guests with all the information they need for the wedding.

## Website Features

### Core Pages

#### **Home Page**
- **Wedding Announcement**: Couple names and wedding date
- **Countdown Timer**: Days until the wedding
- **Hero Image**: Beautiful couple photo or engagement shot (configurable via `website_couple_photo_url`)
- **Welcome Message**: Personal message from the couple
- **Quick Navigation**: Easy access to all website sections with sticky navigation

#### **Our Story**
- **How We Met**: Couple's love story and relationship timeline
- **Engagement Story**: Proposal details and engagement photos
- **Photo Gallery**: Relationship milestones and favorite memories
- **Fun Facts**: Interesting details about the couple

#### **Wedding Details**
- **Date & Time**: Ceremony and reception timing
- **Venue Information**: Ceremony and reception locations with addresses
- **Directions**: Maps and driving directions to venues
- **Parking Information**: Parking availability and instructions
- **Weather Considerations**: Seasonal weather and dress recommendations

#### **Schedule**
- **Wedding Day Timeline**: Complete schedule of events
- **Pre-Wedding Events**: Welcome party, rehearsal dinner details
- **Post-Wedding Events**: Farewell brunch or after-party information
- **Guest Instructions**: What to expect and when to arrive

#### **Travel & Accommodations**
- **Hotel Recommendations**: Preferred hotels with booking links
- **Group Rates**: Special rates negotiated for wedding guests
- **Local Attractions**: Things to do in the wedding location
- **Transportation**: Airport information and shuttle services

### Interactive Features

#### **RSVP System**
- **Guest Lookup**: Guests find themselves by name or invitation code
- **Response Collection**: Accept/decline with guest count
- **Meal Preferences**: Dietary restrictions and meal choices
- **Plus-One Management**: Add plus-one information if applicable
- **Special Requests**: Message field for special accommodations
- **Confirmation**: Immediate confirmation with details

#### **Registry Integration**
- **Multiple Registries**: Links to various registry platforms
- **Gift Tracking**: Integration with popular registry services
- **Cash Funds**: Honeymoon and house fund options
- **Thank You Messages**: Automated thank you note system

#### **Photo Sharing**
- **Guest Photo Upload**: Guests can upload photos from events
- **Real-Time Gallery**: Live photo feed during wedding events
- **Photo Moderation**: Couple approval before photos go live
- **Download Options**: High-resolution downloads for couple

## Technical Implementation

### URL Structure
- **Primary Domain**: `https://eydn.com/w/[slug]`
- **Custom Slugs**: Couples choose their unique URL slug
- **SEO Optimization**: Search engine optimized for discoverability
- **SSL Security**: Secure HTTPS for all wedding websites

### Performance Optimization
- **Fast Loading**: Optimized images and minimal JavaScript
- **Mobile-First**: Responsive design for all device types
- **Caching**: Aggressive caching for fast page loads
- **CDN Distribution**: Global content delivery network

### Customization Options

#### **Visual Customization**
- **Color Schemes**: Multiple pre-designed color palettes
- **Typography**: Font selection for headers and body text
- **Layout Options**: Different page layouts and arrangements
- **Photo Integration**: Custom hero images and gallery layouts

#### **Content Customization**
- **Page Sections**: Enable/disable different website sections
- **Custom Pages**: Add additional pages for special information
- **Navigation Menu**: Customize menu items and organization
- **Footer Content**: Custom footer with couple information

## RSVP Management

### Guest Experience

#### **RSVP Process**
1. **Guest Access**: Guests visit the wedding website
2. **Guest Lookup**: Find their invitation by name or code
3. **Response Selection**: Accept or decline invitation
4. **Guest Details**: Provide meal preferences and dietary restrictions
5. **Plus-One Information**: Add plus-one details if applicable
6. **Confirmation**: Receive immediate confirmation of RSVP

#### **User-Friendly Features**
- **Mobile Optimization**: Easy RSVP on mobile devices
- **Clear Instructions**: Step-by-step RSVP guidance
- **Error Handling**: Helpful error messages and validation
- **Accessibility**: Screen reader compatible and keyboard navigable

### Couple Management

#### **RSVP Dashboard**
- **Response Tracking**: Real-time RSVP status updates
- **Guest Analytics**: Response rates and guest statistics
- **Meal Summary**: Dietary restriction and meal preference summary
- **Export Options**: CSV export for caterer and venue coordination
- **Reminder Tools**: Send RSVP reminders to non-responders

#### **Guest List Integration**
- **Automatic Sync**: RSVPs automatically update main guest list
- **Duplicate Prevention**: Prevent duplicate RSVPs from same guest
- **Plus-One Tracking**: Manage plus-one responses and information
- **Special Requests**: Track special accommodation requests

## Content Management

### Easy Updates
- **Real-Time Editing**: Changes appear immediately on live site
- **Preview Mode**: Preview changes before publishing
- **Version History**: Track and revert content changes
- **Bulk Updates**: Update multiple sections simultaneously

### Content Types

#### **Text Content**
- **Rich Text Editor**: Format text with bold, italic, links
- **Custom Sections**: Add custom text sections anywhere
- **Multilingual Support**: Multiple language options (planned)
- **SEO Optimization**: Meta descriptions and title optimization

#### **Media Management**
- **Photo Galleries**: Unlimited photo uploads and galleries
- **Video Integration**: Embed engagement videos or messages
- **Document Sharing**: Share important documents with guests
- **Audio Messages**: Voice messages from the couple (planned)

## Analytics & Insights

### Website Analytics
- **Visitor Tracking**: Number of unique visitors and page views
- **Popular Pages**: Most visited sections of the website
- **Device Analytics**: Mobile vs. desktop usage statistics
- **Geographic Data**: Where guests are visiting from

### RSVP Analytics
- **Response Rates**: Percentage of guests who have responded
- **Response Timeline**: When guests are responding
- **Meal Preferences**: Breakdown of dietary choices
- **Plus-One Statistics**: Plus-one acceptance rates

## SEO & Discoverability

### Search Engine Optimization
- **Custom Meta Tags**: Optimized titles and descriptions
- **Structured Data**: Rich snippets for search engines
- **Sitemap Generation**: Automatic XML sitemap creation
- **Social Media Tags**: Open Graph and Twitter Card optimization

### Social Sharing
- **Share Buttons**: Easy sharing on social media platforms
- **Custom Preview**: Beautiful preview when shared on social media
- **QR Code Generation**: QR codes for easy website access
- **Link Shortening**: Shortened URLs for easy sharing

## Privacy & Security

### Guest Privacy
- **Private by Default**: Websites not indexed by search engines
- **Guest List Protection**: RSVP system prevents unauthorized access
- **Data Encryption**: All guest data encrypted in transit and at rest
- **GDPR Compliance**: European privacy regulation compliance

### Access Control
- **Password Protection**: Optional password protection for entire site
- **Guest Verification**: RSVP system verifies guest identity
- **Admin Access**: Couple has full control over website content
- **Temporary Disable**: Ability to temporarily disable website

## Integration with Planning Tools

### Seamless Workflow
- **Guest List Sync**: Automatic synchronization with main guest list
- **Task Integration**: Website setup integrated with planning timeline
- **Budget Tracking**: Website costs included in budget management
- **Vendor Coordination**: Share website with vendors for coordination

### Data Flow
- **RSVP to Seating**: RSVP responses flow to seating chart planning
- **Dietary to Catering**: Meal preferences shared with caterer
- **Contact Updates**: Guest contact information kept up-to-date
- **Analytics to Planning**: Website analytics inform planning decisions

## Navigation Enhancement

### Sticky Navigation
- **Smart Scrolling**: Navigation bar appears/hides based on scroll direction
- **Section Highlighting**: Active section highlighted in navigation
- **Smooth Scrolling**: Animated scrolling to sections
- **Mobile Optimization**: Collapsible menu on mobile devices

**Technical Implementation:**
```typescript
// StickyNav component uses IntersectionObserver
const StickyNav = ({ sections }) => {
  const [activeSection, setActiveSection] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  
  // IntersectionObserver for section detection
  // Scroll direction detection for show/hide
  // Smooth scrolling to sections
};
```

## Mobile Experience

### Mobile-First Design
- **Responsive Layout**: Adapts perfectly to all screen sizes
- **Touch-Friendly**: Large buttons and easy navigation
- **Fast Loading**: Optimized for mobile network speeds
- **Offline Support**: Basic functionality works offline

### Mobile-Specific Features
- **Add to Calendar**: One-tap calendar event creation
- **GPS Navigation**: Direct links to venue GPS coordinates
- **Phone Integration**: Tap-to-call vendor phone numbers
- **Photo Upload**: Easy photo upload from mobile devices

## Future Enhancements

### Planned Features (2026)

#### **Advanced Customization**
- **Custom Domains**: Couples can use their own domain names
- **Advanced Themes**: More sophisticated design templates
- **Custom CSS**: Advanced users can add custom styling
- **Animation Options**: Subtle animations and transitions

#### **Enhanced Interactivity**
- **Guest Messaging**: Guests can leave messages for the couple
- **Live Updates**: Real-time updates during wedding events
- **Virtual Attendance**: Live streaming integration for remote guests
- **Interactive Maps**: Detailed venue maps with points of interest

#### **Social Features**
- **Guest Directory**: Guests can see who else is attending
- **Photo Tagging**: Tag guests in uploaded photos
- **Social Feed**: Real-time social media integration
- **Guest Reviews**: Guests can review vendors (with permission)

### Long-Term Vision (2027+)

#### **AI-Powered Features**
- **Content Generation**: AI-assisted content creation
- **Design Optimization**: AI-optimized layouts and designs
- **Guest Personalization**: Personalized content for each guest
- **Smart Recommendations**: AI-powered vendor and service suggestions

#### **Advanced Analytics**
- **Predictive Analytics**: Predict RSVP patterns and guest behavior
- **A/B Testing**: Test different website versions for optimization
- **Conversion Tracking**: Track guest actions and engagement
- **ROI Analysis**: Measure website impact on wedding planning

The wedding website feature provides couples with a professional, beautiful way to share their wedding information with guests while seamlessly integrating with the broader eydn planning platform. This creates a cohesive experience that benefits both couples and their guests throughout the wedding planning and celebration process.