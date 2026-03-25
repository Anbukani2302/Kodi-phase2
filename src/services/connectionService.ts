// services/connectionService.ts
import { ReactNode } from "react";
import api from "./api";
import { cacheService, createCacheKey, withCache } from "./cacheService";

// ===== EXISTING CONNECTION TYPES (KEEP AS IS) =====
export interface Connection {
  id: number;
  user: {
    person_id: number;
    id: number;
    name: string;
    avatar?: string;
  };
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface ConnectionRequest {
  id: number;
  sender: {
    id: number;
    name: string;
    avatar?: string;
  };
  receiver: {
    id: number;
    name: string;
    avatar?: string;
  };
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

// ===== NEW GENEALOGY INVITATION TYPES =====
export interface GenealogyInvitation {
  brick_person_id: any;
  time_ago: ReactNode;
  is_expired: boolean;
  id: number;
  token: string;
  status: "pending" | "accepted" | "rejected" | "expired" | "cancelled";
  created_at: string;
  accepted_at: string | null;
  invited_by: number;
  invited_by_name: string;
  invited_by_mobile: string;
  person: number;
  person_name: string;
  person_gender: string;
  person_is_placeholder: boolean;
  original_relation_code: string;
  to_user_name?: string;
  recipient_display?: string;
  to_user_mobile?: string;
}

export interface ReceivedInvitationsResponse {
  success: boolean;
  count: number;
  invitations: GenealogyInvitation[];
  timestamp: string;
}

export interface SentInvitationsResponse {
  success: boolean;
  sent_invitations: GenealogyInvitation[];
  stats: {
    cancelled: number;
    total: number;
    pending: number;
    accepted: number;
    expired: number;
    rejected: number;
  };
}

// Cancel invitation response types
export interface CancelInvitationResponse {
  success: boolean;
  message: string;
  invitation: {
    id: number;
    status: string;
    cancelled_at: string;
  };
  receiver: {
    id: number;
    mobile: string;
    name: string;
  };
  person: {
    id: number;
    name: string;
    will_be_deleted: boolean;
    deleted: boolean;
  };
  person_deleted: boolean;
}

// Search response types
export interface SearchSuggestion {
  id: number;
  full_name: string;
  mobile_number: string;
  gender: string;
  relation_to_me: {
    code: string;
    label: string;
  };
  relation_label: string;
  family_name: string;
  family_id: number;
  is_placeholder: boolean;
  age: number | null;
  relation_details?: {
    label: string;
    level: string;
    relation_code: string;
    source: string;
    metadata: {
      language: string;
      default_type: string;
    };
  };
  profile: {
    has_profile: boolean;
    public_profile: {
      firstname: string;
      secondname: string;
      thirdname: string;
      fathername1: string;
      fathername2: string;
      mothername1: string;
      mothername2: string;
      gender: string;
      preferred_language: string;
      religion: string;
      caste: string;
      profile_picture: string | null;
    };
    private_fields: null;
    mobile_number: string;
    user_id: number;
  };
  public_profile: {
    firstname: string;
    secondname: string;
    thirdname: string;
    fathername1: string;
    fathername2: string;
    mothername1: string;
    mothername2: string;
    gender: string;
    preferred_language: string;
    religion: string;
    caste: string;
    mobile_number: string;
  };
  date_of_birth: string | null;
  date_of_death: string | null;
  is_alive: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface SearchResponse {
  success: boolean;
  search_term: string;
  suggestions: SearchSuggestion[];
  total_count: number;
  filtered: string;
}

// Updated Person interface with all possible properties
export interface Person {
  id: number;
  full_name: string;
  name?: string; // Alternative name field
  gender: string;
  mobile_number?: string | null;
  profile_picture?: string | null;
  image?: string | null;
  family_name?: string | null;
  family_id?: number;
  family?: number; // Alternative family ID field
  is_placeholder: boolean;
  is_current_user?: boolean;
  generation?: number;
  generation_label?: string;
  age?: number | null;
  total_connected_count?: number;
  immediate_family_count?: number;
  is_alive?: boolean;
  is_verified?: boolean;
  date_of_birth?: string | null;
  date_of_death?: string | null;
  linked_user?: number | null;
  created_at?: string; // Added for compatibility
  updated_at?: string; // Added for compatibility
  public_profile?: {
    firstname: string;
    secondname: string;
    thirdname: string;
    fathername1: string;
    fathername2: string;
    mothername1: string;
    mothername2: string;
    gender: string;
    preferred_language: string;
    religion: string;
    caste: string;
  };
}

export interface RelationLabel {
  label: string;
  level?: string;
  relation_code?: string;
  source?: string;
  metadata?: any;
  arrow_label?: string;
  base_relation?: string;
  refined_relation?: string;
  localization_level?: string;
  path_used?: string[];
  normalized_path?: string[];
  label_metadata?: {
    language: string;
    religion?: string;
    caste?: string;
    family?: string;
    specificity_score?: number;
    default_type?: string;
  };
}

export interface ConnectedPerson {
  person: Person;
  relation_code: string;
  depth: number;
  is_reverse: boolean;
  relation_label: RelationLabel;
}

export interface ConnectedResponse {
  center_person: Person;
  center_person_label: RelationLabel;
  connected_persons: ConnectedPerson[];
  total_count: number;
}

class ConnectionService {
  // ===== EXISTING CONNECTIONS API METHODS (KEEP AS IS) =====

  // GET /api/genealogy/invitations/pending/ - Get pending connection requests (received)
  async getReceivedRequests(): Promise<GenealogyInvitation[]> {
    const cacheKey = createCacheKey('invitations_received');
    return withCache(cacheKey, async () => {
      const response = await api.get("/api/genealogy/invitations/pending/");
      return response.data.invitations || [];
    }, 2 * 60 * 1000); // 2 minutes cache
  }

  // GET /api/genealogy/invitations/sent/ - Get sent invitations
  async getSentRequests(): Promise<SentInvitationsResponse> {
    const cacheKey = createCacheKey('invitations_sent');
    return withCache(cacheKey, async () => {
      const response = await api.get("/api/genealogy/invitations/sent/");
      return response.data;
    }, 2 * 60 * 1000); // 2 minutes cache
  }

  // POST /api/genealogy/invitations/create/ - Send invitation
  async sendRequest(userId: number, relationCode: string): Promise<any> {
    const response = await api.post("/api/genealogy/invitations/create/", {
      invited_user_id: userId,
      relation_code: relationCode,
    });
    
    // Clear caches since data changed
    this.clearInvitationCaches();
    
    return response.data;
  }

  // Add this method to your connectionService
  async getInvitationWithPath(invitationId: number): Promise<any> {
    try {
      // Use POST as the backend expects a POST request for this endpoint
      const response = await api.get(`/api/genealogy/invitations/${invitationId}/view-with-path/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invitation with path:', error);
      throw error;
    }
  }
  // POST /api/genealogy/invitations/:id/accept/ - Accept invitation
  async acceptRequest(invitationId: number): Promise<any> {
    const response = await api.post(
      `/api/genealogy/invitations/${invitationId}/accept/`
    );
    
    // Clear caches since data changed
    this.clearInvitationCaches();
    
    return response.data;
  }

  // POST /api/genealogy/invitations/:id/reject/ - Reject invitation
  async rejectRequest(invitationId: number): Promise<void> {
    await api.post(`/api/genealogy/invitations/${invitationId}/reject/`);
    
    // Clear caches since data changed
    this.clearInvitationCaches();
  }

  // POST /api/genealogy/invitations/sent/:id/cancel/ - Cancel sent invitation
  async cancelInvitation(
    invitationId: number
  ): Promise<CancelInvitationResponse> {
    const response = await api.post(
      `/api/genealogy/invitations/sent/${invitationId}/cancel/`
    );
    
    // Clear caches since data changed
    this.clearInvitationCaches();
    
    return response.data;
  }

  // Helper method to clear invitation-related caches
  private clearInvitationCaches(): void {
    cacheService.clear('invitations_received');
    cacheService.clear('invitations_sent');
  }

  // DELETE /api/connections/:id/ - Remove connection (unfriend)
  async removeConnection(connectionId: number): Promise<void> {
    await api.delete(`/api/connections/${connectionId}/`);
  }

  // GET /api/users/search/ - Search users
  async searchUsers(query: string): Promise<Connection["user"][]> {
    const response = await api.get("/api/auth/api/mobile-search/", {
      params: { q: query },
    });
    return response.data;
  }

  // GET /api/users/suggestions/ - Get friend suggestions
  async getSuggestions(): Promise<Connection["user"][]> {
    const response = await api.get("/api/users/suggestions/");
    return response.data;
  }

  // ===== NEW GENEALOGY API METHODS =====

  // GET /api/genealogy/persons/search/ - Search persons (filters non-placeholders)
  async searchPersons(query: string): Promise<SearchResponse> {
    const response = await api.get("/api/genealogy/persons/search/", {
      params: { q: query },
    });
    return response.data;
  }

  // GET connected persons
  async getConnectedPersons(
    personId: number,
    maxDepth: number = 1
  ): Promise<ConnectedResponse> {
    const response = await api.get(
      `/api/genealogy/persons/${personId}/connected/`,
      {
        params: {
          person_id: personId,
          max_depth: maxDepth,
        },
      }
    );
    return response.data;
  }

  // GET current user's person
  async getCurrentUserPerson(): Promise<Person> {
    const response = await api.get("/api/genealogy/persons/me/");
    return response.data;
  }

  // GET person details by ID
  async getPersonDetails(personId: number): Promise<Person> {
    const response = await api.get(`/api/genealogy/persons/${personId}/`);
    return response.data;
  }

  // GET relations for a person
  async getPersonRelations(personId: number): Promise<any> {
    console.log(`Fetching relations for person ${personId}...`);
    try {
      const response = await api.get(
        `/api/genealogy/persons/${personId}/relations/`
      );
      console.log(`Relations response for ${personId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error fetching relations for person ${personId}:`, error);
      throw error;
    }
  }

  // Helper method to format relation label for display
  formatRelationLabel(relationLabel: RelationLabel): string {
    return relationLabel?.label || relationLabel?.arrow_label || "Connected";
  }

  // Helper method to format relation code to readable format
  formatRelationCode(code: string): string {
    if (!code) return "";
    return code
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  // Helper method to get avatar initial from name
  getAvatarInitial(name: string): string {
    return name?.charAt(0).toUpperCase() || "?";
  }

  // Helper method to format mobile number
  formatMobileNumber(mobile: string): string {
    if (!mobile) return "";
    // Show last 4 digits with asterisks
    if (mobile.length >= 4) {
      return "••••••" + mobile.slice(-4);
    }
    return mobile;
  }
}

export const connectionService = new ConnectionService();
export default connectionService;
