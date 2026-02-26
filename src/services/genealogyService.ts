// services/genealogyService.ts
import api from "./api";

export interface Person {
  id: number;
  full_name: string;
  gender: string;
  is_placeholder: boolean;
  family_id: number;
}

export interface TargetPerson {
  id: number;
  full_name: string;
  is_current_user: boolean;
}

export interface Relation {
  id: number;
  relation_to_me: string;
  relation_label: string;
  status: string;
  direction: string;
  auto_confirmed: boolean;
}

export interface NextAction {
  action: string;
  label: string;
  method: string;
  url: string;
}

export interface AddRelativeResponse {
  success: boolean;
  message: string;
  person: Person;
  target_person: TargetPerson;
  relation: Relation;
  next_actions: NextAction[];
}

export interface AddRelativePayload {
  full_name: string;
  relation_to_me: string;
  dob?: string;
  base_person: "self" | "other";
  person_id?: number;
}

export interface UpdateNameResponse {
  success: boolean;
  message: string;
  new_name: string;
  person_id: number;
}

export interface UpdateNamePayload {
  name: string;
}

export interface PersonDetailResponse {
  id: number;
  linked_user: number;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  age: number | null;
  family: number;
  is_alive: boolean;
  is_verified: boolean;
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
  };
  is_current_user: boolean;
  created_at: string;
  updated_at: string;
  image?: string;
}

// UPDATED: SendInvitationResponse interface
export interface SendInvitationResponse {
  code: string;
  status: string;
  success: boolean;
  message: string;
  invitation_sent: boolean;
  person_id: number;
  invitation_id?: number;
  otp_sent?: boolean;
}

// UPDATED: SendInvitationPayload interface - includes relation_to_me
export interface SendInvitationPayload {
  mobile_number: string;
  father_name?: string;
  relation_type?: string;
  relation_to_me?: string;
  message?: string;
}

export interface NextFlowResponse {
  status: string;
  person: {
    id: number;
    name: string;
    gender: string;
    is_placeholder: boolean;
    has_father: boolean;
    has_mother: boolean;
    has_spouse: boolean;
    linked_user?: number | null;
  };
  existing_relations: Array<{
    person_id: number;
    name: string;
    direct_relation: string;
    relation_label: string;
    relation_to_viewer: string;
  }>;
  permissions: {
    can_edit: boolean;
    can_add_relatives: boolean;
    is_readonly: boolean;
    is_connected?: boolean;
    is_owner?: boolean;
    is_in_family?: boolean;
  };
  options: Array<{
    action: string;
    label: string;
    relation_code?: string;
    auto_gender?: string;
    icon?: string;
    description?: string;
    category?: string;
  }>;
  total_options: number;
}

export interface RelationItem {
  id: number;
  from_person: number;
  from_person_name: string;
  to_person: number;
  to_person_name: string;
  relation: number;
  relation_code: string;
  relation_label: {
    label: string;
    level: string;
    relation_code: string;
    source: string;
  };
  status: string;
  conflict_reason: string | null;
  conflicts: string[];
  created_by: number;
  created_at: string;
  updated_at: string;
  arrow_label?: string;
  brick_label?: string;
  image?: string;
}

export interface PersonResponse {
  id: number;
  linked_user: number;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  date_of_death: string | null;
  age: number | null;
  family: number;
  is_alive: boolean;
  is_verified: boolean;
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
  };
  is_current_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface AddRelativeActionResponse {
  success: boolean;
  message: string;
  new_person?: {
    id: number;
    name: string;
    gender: string;
    is_placeholder: boolean;
  };
  relation?: {
    id: number;
    type: string;
    status: string;
    from_person_id: number;
    to_person_id: number;
  };
}

export interface AddRelativeActionPayload {
  action: string;
  full_name: string;
}

export interface PersonRelationsResponse {
  status?: string;
  view_type?: string;
  permissions?: {
    can_edit: boolean;
    can_add_relatives: boolean;
    can_delete: boolean;
    is_owner: boolean;
    is_in_family: boolean;
    is_connected: boolean;
    is_readonly: boolean;
  };
  outgoing: RelationItem[];
  incoming: RelationItem[];
  person?: any;
  family_info?: any;
  family_members?: any[];
}

export interface PersonMeResponse extends PersonDetailResponse {
  // Same as PersonDetailResponse but from /me/ endpoint
}

export interface GenerationInfo {
  person: {
    id: number;
    name: string;
    gender: string;
    is_current_user: boolean;
  };
  generation: {
    number: number;
    label: string;
    description: string;
    level: string;
  };
  member_counts: {
    immediate_family: number;
    total_connected: number;
    extended_family: number;
  };
  relationship: any;
  viewer: {
    id: number;
    name: string;
    generation: number;
  };
}

// NEW: Interface for relation types dropdown
export interface RelationTypeOption {
  value: string;
  label: string;
  category: string;
}

export interface RelationTypesResponse {
  [category: string]: RelationTypeOption[];
}

class GenealogyService {
  async addRelative(data: AddRelativePayload): Promise<AddRelativeResponse> {
    console.log("API Call - addRelative:");
    console.log("Endpoint:", "/api/genealogy/persons/add_relative/");
    console.log("Data:", data);

    try {
      const response = await api.post(
        "/api/genealogy/persons/add_relative/",
        data
      );

      console.log("API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error:", error);
      console.error("Error Response:", error.response);
      throw error;
    }
  }

  async getPersonDetails(personId: number): Promise<PersonDetailResponse> {
    console.log(`API Call - getPersonDetails for ID: ${personId}`);
    console.log("Endpoint:", `/api/genealogy/persons/${personId}/`);

    try {
      const response = await api.get(`/api/genealogy/persons/${personId}/`);
      console.log("API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(`API Error fetching person ${personId}:`, error);
      throw error;
    }
  }

  async updateRelativeName(personId: number, newName: string): Promise<UpdateNameResponse> {
    console.log("API Call - updateRelativeName:");
    console.log("Endpoint:", `/api/genealogy/persons/${personId}/update_name/`);
    console.log("Data:", { name: newName });

    try {
      const response = await api.put(
        `/api/genealogy/persons/${personId}/update_name/`,
        { name: newName }
      );

      console.log("API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // UPDATED: sendInvitation method with correct parameters
  async sendInvitation(
    personId: number,
    payloadOrMobileNumber: string | SendInvitationPayload,
    fatherName?: string,
    relationType?: string
  ): Promise<SendInvitationResponse> {
    console.log("API Call - sendInvitation:");
    console.log("Endpoint:", `/api/genealogy/persons/${personId}/send_invitation/`);

    let finalPayload: any = {};

    if (typeof payloadOrMobileNumber === 'object') {
      finalPayload = { ...payloadOrMobileNumber };
      // Ensure relation_type is set if only relation_to_me is provided (backward compatibility)
      if (!finalPayload.relation_type && finalPayload.relation_to_me) {
        finalPayload.relation_type = finalPayload.relation_to_me;
      }
    } else {
      finalPayload = {
        mobile_number: payloadOrMobileNumber,
        relation_type: relationType
      };
      if (fatherName) {
        finalPayload.father_name = fatherName;
      }
    }

    console.log("Data:", finalPayload);

    try {
      const response = await api.post(
        `/api/genealogy/persons/${personId}/send_invitation/`,
        finalPayload
      );

      console.log("API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error in sendInvitation:", error);
      console.error("Error Response:", error.response?.data);
      throw error;
    }
  }

  // NEW: Get relation types for dropdown
  async getRelationTypes(lang: string = 'en'): Promise<RelationTypesResponse> {
    console.log(`API Call - getRelationTypes for language: ${lang}`);

    try {
      const response = await api.get(`/api/fixed-relations/dropdown_options/?lang=${lang}`);
      console.log("Relation types response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching relation types:", error);
      throw error;
    }
  }

  // NEW: Get all relations in a specific language
  async getRelationsByLanguage(lang: string = 'en'): Promise<any> {
    console.log(`API Call - getRelationsByLanguage: ${lang}`);

    try {
      const response = await api.get(`/api/fixed-relations/by_language/?lang=${lang}`);
      console.log("Relations by language response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching relations by language:", error);
      throw error;
    }
  }

  async getPersonRelations(personId: number): Promise<PersonRelationsResponse> {
    console.log(`Fetching relations for person ${personId}`);

    try {
      const response = await api.get(
        `/api/genealogy/persons/${personId}/relations/`
      );

      console.log("Relations response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching relations:", error);
      throw error;
    }
  }

  async getPersonMe(): Promise<PersonMeResponse> {
    console.log("API Call - getPersonMe from /me/ endpoint");

    try {
      const response = await api.get("/api/genealogy/persons/me/");
      console.log("/me/ endpoint response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching /me/ endpoint:", error);
      throw error;
    }
  }

  async getNextFlow(personId: number): Promise<NextFlowResponse> {
    console.log(`API Call - getNextFlow for person ${personId}`);

    try {
      const response = await api.get(
        `/api/genealogy/persons/${personId}/next_flow/`
      );

      console.log("Next flow response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching next flow:", error);
      throw error;
    }
  }

  async getCurrentPerson(): Promise<PersonResponse> {
    console.log("API Call - getCurrentPerson (legacy):");

    try {
      const response = await api.get('/api/genealogy/persons/me/');
      console.log("API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error fetching current person:", error);
      console.error("Error Response:", error.response);
      throw error;
    }
  }

  async addRelativeAction(personId: number, data: AddRelativeActionPayload): Promise<AddRelativeResponse> {
    console.log(`API Call - addRelativeAction for person ${personId}:`, data);
    try {
      const response = await api.post(
        `/api/genealogy/persons/${personId}/add_relative_action/`,
        data
      );
      console.log("addRelativeAction API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error in addRelativeAction:", error);
      throw error;
    }
  }

  async getGenerationInfo(personId: number): Promise<GenerationInfo> {
    console.log(`API Call - getGenerationInfo for person ${personId}`);

    try {
      const response = await api.get(`/api/genealogy/person/${personId}/generation-info/`);
      console.log("Generation info response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching generation info:", error);
      throw error;
    }
  }

  async searchPersons(query: string): Promise<any> {
    console.log(`API Call - searchPersons for query: ${query}`);
    try {
      const response = await api.get(`/api/genealogy/persons/search/?q=${query}`);
      console.log("Search response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error searching persons:", error);
      throw error;
    }
  }
}

export const genealogyService = new GenealogyService();
export default genealogyService;