// services/genealogyService.ts
import api from "./api";

export interface Person {
  id: number;
  full_name: string;
  name?: string;
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
  new_person?: Person;
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
  mobile_number: PersonDetailResponse;
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
    console.log("Endpoint:", "/api/genealogy/persons/{id}/add_relative_action/");
    console.log("Data:", data);

    try {
      // First get current user ID from /me endpoint
      let personId: number;

      if (data.base_person === "self") {
        // For self, fetch current user ID
        try {
          const meResponse = await this.getPersonMe();
          personId = meResponse.id;
          console.log("Current user ID from /me:", personId);
        } catch (error) {
          console.error("Error fetching current user ID:", error);
          personId = 1; // Fallback
        }
      } else if (data.person_id) {
        // For other person, use provided person_id
        personId = data.person_id;
      } else {
        // Default fallback
        personId = 1;
      }

      const endpoint = `/api/genealogy/persons/${personId}/add_relative_action/`;

      // Comprehensive mapping of UI relation values to backend actions
      const relationMap: Record<string, string> = {
        // Basic relations
        father: "add_father",
        mother: "add_mother",
        son: "add_son",
        magan: "add_magan",
        daughter: "add_daughter",
        magal: "add_maghazh",
        maghazl: "add_maghazh",

        // Siblings with age
        elder_brother: "add_elder_brother",
        anna: "add_anna",
        younger_brother: "add_younger_brother",
        thambi: "add_thambi",
        elder_sister: "add_elder_sister",
        akka: "add_akka",
        younger_sister: "add_younger_sister",
        thangai: "add_thangai",
        brother: "add_elder_brother",
        sister: "add_elder_sister",

        // Spouse/Partner
        husband: "add_husband",
        wife: "add_wife",
        spouse: "add_spouse",
        partner: "add_partner",

        // Grandparents
        thatha: "add_thatha",
        grandfather: "add_thatha",
        paati: "add_paati",
        grandmother: "add_paati",

        // Uncles
        periyappa: "add_periyappa",
        chithappa: "add_chithappa",

        // Aunts
        periyamma: "add_periyamma",
        chithi: "add_chithi",

        // Maternal/Paternal
        mama: "add_mama",
        athai: "add_athai",

        // In-laws
        athan: "add_athan",
        anni: "add_anni",
        kolunthanar: "add_kolunthanar",
        kolunthiyazh: "add_kolunthiyazh",

        // Children-in-law
        marumagan: "add_marumagan",
        son_in_law: "add_marumagan",
        marumagal: "add_marumagal",
        daughter_in_law: "add_marumagal",

        // Grandchildren
        peran: "add_peran",
        grandson: "add_peran",
        petthi: "add_petthi",
        granddaughter: "add_petthi",

        // Tamil terms
        'அப்பா': 'add_father',
        'அம்மா': 'add_mother',
        'அண்ணன்': 'add_anna',
        'தம்பி': 'add_thambi',
        'அக்கா': 'add_akka',
        'தங்கை': 'add_thangai',
        'மகன்': 'add_magan',
        'மகள்': 'add_maghazh',
        'தாத்தா': 'add_thatha',
        'பாட்டி': 'add_paati',
        'பெரியப்பா': 'add_periyappa',
        'சித்தப்பா': 'add_chithappa',
        'பெரியம்மா': 'add_periyamma',
        'சித்தி': 'add_chithi',
        'மாமா': 'add_mama',
        'அத்தை': 'add_athai',
        'அத்தான்': 'add_athan',
        'அண்ணி': 'add_anni',
        'மருமகன்': 'add_marumagan',
        'மருமகள்': 'add_marumagal',
        'பேரன்': 'add_peran',
        'பேத்தி': 'add_petthi'
      };

      if (!data.relation_to_me) {
        throw new Error("relation_to_me is required");
      }

      // Normalize relation key (remove extra spaces, convert to lowercase)
      let relationKey = data.relation_to_me.trim().toLowerCase();

      // Try direct lookup first
      let action = relationMap[relationKey];

      // If not found, try without spaces
      if (!action) {
        const noSpaceKey = relationKey.replace(/\s+/g, '');
        action = relationMap[noSpaceKey];
      }

      // If still not found, check if it's already in add_ format
      if (!action && relationKey.startsWith('add_')) {
        action = relationKey; // Use as-is
      }

      // If still not found, throw error
      if (!action) {
        console.error(`No mapping found for relation: "${data.relation_to_me}" (normalized: "${relationKey}")`);
        console.log("Available relations:", Object.keys(relationMap));
        throw new Error(`Invalid relation type: ${data.relation_to_me}`);
      }

      const transformedPayload = {
        action: action,
        full_name: data.full_name
      };

      console.log("Final personId:", personId);
      console.log("Transformed endpoint:", endpoint);
      console.log("Transformed payload:", transformedPayload);

      const response = await api.post(endpoint, transformedPayload);

      console.log("API Response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error:", error);
      console.error("Error Response:", error.response);

      // Handle specific error codes
      if (error.response?.status === 403) {
        const errorMessage = error.response.data?.error || error.response.data?.message || "You don't have permission to add relatives to this person";
        console.error("403 Forbidden:", errorMessage);

        if (errorMessage.includes("permission_denied") || errorMessage.includes("cannot add relatives")) {
          throw new Error("This person has restricted family access. Only family members with proper permissions can add relatives.");
        } else if (errorMessage.includes("not found")) {
          throw new Error("Person not found or does not exist.");
        } else {
          throw new Error(errorMessage);
        }
      } else if (error.response?.status === 404) {
        const errorMessage = error.response.data?.message || "Person not found";
        console.error("404 Not Found:", errorMessage);
        throw new Error(errorMessage);
      } else if (error.response?.status === 401) {
        const errorMessage = error.response.data?.message || "You are not authenticated";
        console.error("401 Unauthorized:", errorMessage);
        throw new Error(errorMessage);
      }

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
    console.log(`🔵🔵🔵 addRelativeAction CALLED for person ${personId}:`, data);
    console.trace("🔍 Stack trace:");

    try {
      let mappedAction = data.action?.toLowerCase() || '';

      const actionMap: Record<string, string> = {
        'add_brother': 'add_elder_brother',
        'add_sister': 'add_elder_sister',
        'add_grandson': 'add_peran',
        'add_grand_son': 'add_peran',
        'add_granddaughter': 'add_petthi',
        'add_grand_daughter': 'add_petthi',
        'add_grandfather': 'add_thatha',
        'add_grand_father': 'add_thatha',
        'add_grandmother': 'add_paati',
        'add_grand_mother': 'add_paati',
        'add_brother-in-law': 'add_maithunar',
        'add_brother_in_law': 'add_maithunar',
        'add_sister-in-law': 'add_anni',
        'add_sister_in_law': 'add_anni',
        'add_son-in-law': 'add_marumagan',
        'add_son_in_law': 'add_marumagan',
        'add_daughter-in-law': 'add_marumagal',
        'add_daughter_in_law': 'add_marumagal',
        'add_uncle': 'add_mama',
        'add_aunt': 'add_athai',
        'add_mythun': 'add_mythuni',
        'add_மைத்துனி': 'add_mythuni',
        'add_கொழுந்தியாழ்': 'add_kolunthiyazh'
      };

      if (actionMap[mappedAction]) {
        mappedAction = actionMap[mappedAction];
      }

      const transformedPayload = { ...data, action: mappedAction };

      console.log("📤 Making API POST request to:", `/api/genealogy/persons/${personId}/add_relative_action/`);
      console.log("📤 Request payload:", transformedPayload);

      const response = await api.post(
        `/api/genealogy/persons/${personId}/add_relative_action/`,
        transformedPayload
      );

      console.log("📥 API Response received:", response.data);
      return response.data;

    } catch (error: any) {
      console.error("🔴 API Error in addRelativeAction:", error);
      console.error("🔴 Error response:", error.response?.data);
      console.error("🔴 Error status:", error.response?.status);

      // Check for specific error about invalid action
      if (error.response?.data?.code === 'invalid_action') {
        console.log("❌ Invalid action. Valid actions:", error.response?.data?.valid_actions);
      }

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

  async getAshramamRelations(personId: number): Promise<any> {
    console.log(`API Call - getAshramamRelations for person ${personId}`);
    try {
      const response = await api.get(`/api/genealogy/persons/${personId}/ashramam-relations/`);
      console.log("Ashramam relations response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching ashramam relations:", error);
      throw error;
    }
  }

  async addCustomRelative(personId: number, payload: {
    from_relationship_name: string;
    to_relationship_name: string;
    name: string;
    gender: string;
  }): Promise<any> {
    console.log(` API Call - addCustomRelative for person ${personId}:`, payload);
    try {
      const response = await api.post(`/api/genealogy/persons/${personId}/add-custom-relative/`, payload);
      console.log(" Add custom relative response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error(" Error adding custom relative:", error);
      console.error(" Error response data:", error.response?.data);
      console.error(" Error status:", error.response?.status);
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

  async getRelationBetween(person1Id: number, person2Id: number, centerPersonId: number): Promise<any> {
    console.log(`📡 genealogyService.getRelationBetween: p1=${person1Id}, p2=${person2Id}, center=${centerPersonId}`);
    try {
      // Use full URL pattern just in case
      const response = await api.post('/api/genealogy/relation-between/', {
        person1_id: Number(person1Id),
        person2_id: Number(person2Id),
        center_person_id: Number(centerPersonId)
      });
      console.log("📥 API raw response:", response);
      return response.data;
    } catch (error: any) {
      console.error("🔴 API call error in getRelationBetween:", error);
      if (error.response) {
        console.error("🔴 Error response data:", error.response.data);
        console.error("🔴 Error response status:", error.response.status);
      }
      throw error;
    }
  }

  async getConnectedPersons(personId: number, maxDepth: number = 1): Promise<any> {
    console.log(`API Call - getConnectedPersons for person ${personId} with max_depth ${maxDepth}`);
    try {
      const response = await api.get(`/api/genealogy/persons/${personId}/connected/?person_id=${personId}&max_depth=${maxDepth}`);
      console.log("Connected persons response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching connected persons:", error);
      throw error;
    }
  }
}

export const genealogyService = new GenealogyService();
export default genealogyService;