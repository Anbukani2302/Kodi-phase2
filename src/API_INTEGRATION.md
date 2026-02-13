# API Integration Guide

## Base Configuration

Update your backend URL in `/services/api.ts`:

```typescript
export const BASE_URL = 'https://your-api-domain.com';
```

## API Endpoints Required

### Authentication APIs

#### 1. Request OTP
```
POST /api/auth/request-otp/
Body: { phone_number: string }
Response: { message: string }
```

#### 2. Verify OTP
```
POST /api/auth/verify-otp/
Body: { mobile_number: string, otp: string }
Response: {
  access: string,
  refresh: string,
  user: { id: number, mobile_number: string, is_active: boolean }
}
```

#### 3. Refresh Token
```
POST /api/auth/refresh-token/
Body: { refresh: string }
Response: { access: string }
```

### Profile APIs

#### 4. Get My Profile
```
GET /api/profile/me/
Headers: Authorization: Bearer {token}
Response: UserProfile (see below)
```

#### 5. Update My Profile
```
PUT /api/profile/me/
Headers: Authorization: Bearer {token}
Body: Partial<UserProfile>
Response: UserProfile
```

### Post APIs

#### 6. Get Posts (Feed)
```
GET /api/posts/?page=1&limit=10
Headers: Authorization: Bearer {token}
Response: {
  results: Post[],
  count: number
}
```

#### 7. Create Post
```
POST /api/posts/
Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
Body: FormData { content: string, image?: File }
Response: Post
```

#### 8. Like Post
```
POST /api/posts/:id/like/
Headers: Authorization: Bearer {token}
Response: { message: string, is_liked: boolean }
```

#### 9. Unlike Post
```
POST /api/posts/:id/unlike/
Headers: Authorization: Bearer {token}
Response: { message: string, is_liked: boolean }
```

#### 10. Share Post
```
POST /api/posts/:id/share/
Headers: Authorization: Bearer {token}
Body: { content?: string }
Response: Post
```

#### 11. Get Comments
```
GET /api/posts/:id/comments/
Headers: Authorization: Bearer {token}
Response: Comment[]
```

#### 12. Create Comment
```
POST /api/posts/:id/comments/
Headers: Authorization: Bearer {token}
Body: { content: string }
Response: Comment
```

### Chat APIs

#### 13. Get Conversations
```
GET /api/conversations/
Headers: Authorization: Bearer {token}
Response: Conversation[]
```

#### 14. Get Messages
```
GET /api/conversations/:id/messages/?page=1
Headers: Authorization: Bearer {token}
Response: Message[]
```

#### 15. Send Message
```
POST /api/messages/
Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
Body: FormData { conversation: number, content: string, image?: File }
Response: Message
```

#### 16. Mark All as Read
```
PUT /api/conversations/:id/read-all/
Headers: Authorization: Bearer {token}
Response: { message: string }
```

### Connection APIs

#### 17. Get Connections (Friends)
```
GET /api/connections/?status=accepted
Headers: Authorization: Bearer {token}
Response: Connection[]
```

#### 18. Get Received Requests
```
GET /api/connections/requests/?type=received&status=pending
Headers: Authorization: Bearer {token}
Response: ConnectionRequest[]
```

#### 19. Get Sent Requests
```
GET /api/connections/requests/?type=sent&status=pending
Headers: Authorization: Bearer {token}
Response: ConnectionRequest[]
```

#### 20. Send Connection Request
```
POST /api/connections/send/
Headers: Authorization: Bearer {token}
Body: { receiver_id: number }
Response: ConnectionRequest
```

#### 21. Accept Request
```
POST /api/connections/:id/accept/
Headers: Authorization: Bearer {token}
Response: Connection
```

#### 22. Reject Request
```
POST /api/connections/:id/reject/
Headers: Authorization: Bearer {token}
Response: { message: string }
```

### Genealogy APIs

#### 23. Get Family Tree
```
GET /api/genealogy/
Headers: Authorization: Bearer {token}
Response: FamilyTree
```

#### 24. Upload Tree Image
```
POST /api/genealogy/upload-image/
Headers: Authorization: Bearer {token}, Content-Type: multipart/form-data
Body: FormData { image: File }
Response: { image_url: string }
```

#### 25. Get Family Members
```
GET /api/genealogy/members/
Headers: Authorization: Bearer {token}
Response: FamilyMember[]
```

#### 26. Add Family Member
```
POST /api/genealogy/members/
Headers: Authorization: Bearer {token}
Body: CreateFamilyMemberData
Response: FamilyMember
```

## Data Models

### UserProfile
```typescript
{
  id?: number;
  firstname?: string;
  secondname?: string;
  thirdname?: string;
  fathername1?: string;
  fathername2?: string;
  mothername1?: string;
  mothername2?: string;
  gender?: string; // 'M' | 'F' | 'O'
  dateofbirth?: string; // 'YYYY-MM-DD'
  age?: number;
  native?: string;
  present_city?: string;
  taluk?: string;
  district?: string;
  state?: string;
  contact_number?: string;
  nationality?: string;
  cultureoflife?: string;
  familyname1?: string;
  familyname2?: string;
  familyname3?: string;
  familyname4?: string;
  familyname5?: string;
  preferred_language?: string;
  religion?: string;
  caste?: string;
  created_at?: string;
  updated_at?: string;
}
```

### Post
```typescript
{
  id: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  content: string;
  image?: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
}
```

### Message
```typescript
{
  id: number;
  conversation: number;
  sender: {
    id: number;
    name: string;
    avatar?: string;
    online?: boolean;
  };
  content: string;
  image?: string;
  is_read: boolean;
  created_at: string;
}
```

### Connection
```typescript
{
  id: number;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
}
```

### FamilyMember
```typescript
{
  id: number;
  name: string;
  avatar?: string;
  relation: string;
  generation: number;
  birth_year?: number;
  death_year?: number;
  is_alive: boolean;
  gender: 'M' | 'F' | 'O';
  spouse_id?: number;
  parent_ids: number[];
  children_ids: number[];
  position?: { x: number; y: number };
}
```

## Error Handling

All API calls include automatic error handling with:
- Token refresh on 401 errors
- Automatic logout on refresh failure
- Error messages returned to UI components

## Testing

To test without a backend:
1. Mock responses in service files
2. Use localStorage for temporary data
3. Use setTimeout to simulate async operations

## Security Notes

- All API calls include Authorization header automatically
- Tokens stored in localStorage (consider httpOnly cookies for production)
- CORS must be configured on backend
- Use HTTPS in production
