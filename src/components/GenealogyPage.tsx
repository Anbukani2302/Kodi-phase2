import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Edit,
  Flower2,
  Link,
  UserPlus,
  X,
  Phone,
  Send,
  Save,
  RefreshCw,
  Bell,
  Users,
  Hash,
  ChevronRight,
  ChevronLeft,
  Home,
  UserCircle,
  ArrowRight,
  Search,
  Info
} from 'lucide-react';
import { authService, UserProfile } from '../services/authService';
import {
  genealogyService,
  AddRelativePayload,
  AddRelativeActionPayload,
  PersonRelationsResponse,
  PersonDetailResponse,
  SendInvitationPayload
} from '../services/genealogyService';
import { connectionService } from '../services/connectionService';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import api, { BASE_URL } from '../services/api';

// Import images
import relationImg from '../images/relation.png';
import kalacharamImg from '../images/kalacharam.png';
import kalacharam1Img from '../images/kalacharam1.png';
import mapImg from '../images/map.png';
import connectionImg from '../images/connection.png';
import connectImg from '../images/connect.png';
import settingImg from '../images/setting.png';
import relation1Img from '../images/relation1.png';

interface UniverseNode {
  id: string;
  name: string;
  relation: string;
  relationLabel?: string;
  arrowLabel?: string;
  level: number;
  parentId: string | null;
  position: { x: number; y: number };
  isOpen: boolean;
  gender?: string;
  personId?: number;
  isUpdated?: boolean;
  isConnected?: boolean;
  isReadOnly?: boolean;
  image?: string | null;
}

// Add GenerationInfo interface
interface GenerationInfo {
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

// Add NavigationHistory interface
interface NavigationHistoryItem {
  id: string;
  name: string;
  relation: string;
  personId?: number;
  level: number;
  timestamp: number;
  arrowLabel?: string;
  calculatedRelation?: string;
  isUpdated?: boolean;
}

// Add HoverInfo interface
interface HoverInfo {
  label: string;
  englishLabel: string;
  explanation: string;
  path: string[];
  fromPersonName: string;
  isLoading: boolean;
  position?: { x: number; y: number };
}

// Add MobileSearchResult interface for the new API
interface MobileSearchResult {
  id: number;
  mobile_number: string;
  label: string;
  value: string;
}

const RADIUS_BASE = 240;
const ALL_RELATIONS = [
  'Father', 'Mother', 'Elder Brother', 'Elder Sister', 'Son',
  'Daughter', 'Husband', 'Wife', 'Ashramam', 'Younger Brother', 'Younger Sister'
];
// Fixed: Include all relations for Add People modal
const EXCLUDED_FROM_ADD_PEOPLE: string[] = []; // Empty array - allow all relations to show Add People button

// Helper function to map UI relation to API relation format
const mapRelationToAPI = (uiRelation: string): string => {
  const relationMap: { [key: string]: string } = {
    'Father': 'FATHER',
    'Mother': 'MOTHER',
    'Elder Brother': 'ELDER_BROTHER',
    'Elder Sister': 'ELDER_SISTER',
    'Younger Brother': 'YOUNGER_BROTHER',
    'Younger Sister': 'YOUNGER_SISTER',
    'Son': 'SON',
    'Daughter': 'DAUGHTER',
    'Husband': 'HUSBAND',
    'Wife': 'WIFE',
    'Ashramam': 'ASHRAMAM',
    'Ashramam Member': 'ASHRAWAM_MEMBER',
    'Brother': 'BROTHER',
    'Sister': 'SISTER'
  };

  if (uiRelation === uiRelation.toUpperCase()) {
    return uiRelation;
  }

  const mapped = relationMap[uiRelation] || uiRelation.toUpperCase().replace(' ', '_');
  return mapped;
};

const getFullImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  if (typeof imagePath !== 'string') return null;
  if (imagePath.startsWith('http')) return imagePath;

  const cleanBase = BASE_URL.replace(/\/$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${cleanBase}${cleanPath}`;
};

const mapAPIToUIRelation = (apiRelationCode: string): string => {
  const relationMap: { [key: string]: string } = {
    'FATHER': 'Father',
    'MOTHER': 'Mother',
    'ELDER_BROTHER': 'Elder Brother',
    'ELDER_SISTER': 'Elder Sister',
    'YOUNGER_BROTHER': 'Younger Brother',
    'YOUNGER_SISTER': 'Younger Sister',
    'SON': 'Son',
    'DAUGHTER': 'Daughter',
    'HUSBAND': 'Husband',
    'WIFE': 'Wife',
    'ASHRAWAM': 'Ashramam',
    'ASHRAMAM': 'Ashramam',
    'ASHRAWAM_MEMBER': 'Ashramam Member',
    'BROTHER': 'Brother',
    'SISTER': 'Sister'
  };

  return relationMap[apiRelationCode] || apiRelationCode.replace('_', ' ');
};

// NEW: Function to get display label based on source
const getDisplayLabel = (relationLabelData: any, isNextFlow: boolean = false): string => {
  // If this is from next_flow endpoint
  if (isNextFlow) {
    // For next_flow: if source is inverse_to_me and user_label exists, show user_label
    if (relationLabelData && relationLabelData.source === 'inverse_to_me' && relationLabelData.user_label) {
      return relationLabelData.user_label;
    }
    // Otherwise for next_flow, show the normal label
    return relationLabelData?.label || '';
  }

  // Original logic for other endpoints (non-next_flow)
  if (relationLabelData && relationLabelData.source === 'inverse_from_me' && relationLabelData.user_label) {
    // Show user_label only for inverse_from_me
    return relationLabelData.user_label;
  }

  // For all other cases, show the normal label
  return relationLabelData?.label || '';
};

// Relation code-லிருந்து gender determine பண்ணுற function
const getGenderFromRelation = (relationCode: string, isFromRelation: boolean = true): string => {
  const femaleRelations = ['MOTHER', 'WIFE', 'ELDER_SISTER', 'YOUNGER_SISTER', 'DAUGHTER', 'SISTER'];
  const maleRelations = ['FATHER', 'HUSBAND', 'ELDER_BROTHER', 'YOUNGER_BROTHER', 'SON', 'BROTHER'];

  if (femaleRelations.includes(relationCode)) {
    return 'F';
  } else if (maleRelations.includes(relationCode)) {
    return 'M';
  }

  return 'M';
};

// Function to get inverse relation (recipient's perspective)
const getInverseRelation = (relation: string, recipientGender: string = 'M'): string => {
  const gender = recipientGender?.toUpperCase() || 'M';

  // Map relation from sender's perspective to recipient's perspective
  const inverseMap: { [key: string]: string } = {
    'Father': gender === 'F' ? 'Daughter' : 'Son',
    'Mother': gender === 'F' ? 'Daughter' : 'Son',
    'Son': gender === 'F' ? 'Mother' : 'Father',
    'Daughter': gender === 'F' ? 'Mother' : 'Father',
    'Husband': 'Wife',
    'Wife': 'Husband',
    'Elder Brother': gender === 'M' ? 'Younger Brother' : 'Younger Sister',
    'Younger Brother': gender === 'M' ? 'Elder Brother' : 'Elder Sister',
    'Elder Sister': gender === 'M' ? 'Younger Sister' : 'Younger Brother',
    'Younger Sister': gender === 'M' ? 'Elder Sister' : 'Elder Brother',
    'Ashramam': 'Ashramam Member',
    'Ashramam Member': 'Ashramam'
  };

  return inverseMap[relation] || relation;
};

// Updated: Function to get ME label based on parent (center) node's gender
const getMeLabel = (parentGender: string, relation: string, isTamil: boolean = false): string => {
  const gender = parentGender?.toUpperCase() || 'M';

  // Check for specific sibling relations
  const isElderBrother = relation === 'Elder Brother';
  const isYoungerBrother = relation === 'Younger Brother';
  const isElderSister = relation === 'Elder Sister';
  const isYoungerSister = relation === 'Younger Sister';
  const isBrother = relation === 'Brother';
  const isSister = relation === 'Sister';

  // Check if it's any sibling relation
  const isSibling = isElderBrother || isYoungerBrother || isElderSister || isYoungerSister || isBrother || isSister;

  // Determine if the relation is a child relation
  const isChild = ['Son', 'Daughter'].includes(relation);

  // Determine if the relation is a spouse relation
  const isSpouse = ['Husband', 'Wife'].includes(relation);

  // Determine if the relation is a parent relation
  const isParent = ['Father', 'Mother'].includes(relation);

  if (gender === 'F') {
    // Parent is Female (center node is female)
    if (isTamil) {
      if (isElderBrother || isElderSister) {
        // If child is Elder, I am Younger Sister
        return 'தங்கை';
      } else if (isYoungerBrother || isYoungerSister) {
        // If child is Younger, I am Elder Sister
        return 'அக்கா';
      } else if (isBrother || isSister) {
        return 'சகோதரி'; // Generic Sister
      } else if (isChild) {
        // For female parent, child relations: "அம்மா" (mother)
        return 'அம்மா';
      } else if (isSpouse) {
        // For female parent, spouse relations: "மனைவி" (wife)
        return 'மனைவி';
      } else if (isParent) {
        // For female parent, parent relations: "மகள்" (daughter)
        return 'மகள்';
      } else if (relation === 'Ashramam' || relation === 'Ashramam Member') {
        // For Ashramam relations
        return 'உறுப்பினர்';
      }
      return 'மகள்'; // Default for female
    } else {
      if (isElderBrother || isElderSister) {
        // If child is Elder, I am Younger Sister
        return 'Younger Sister';
      } else if (isYoungerBrother || isYoungerSister) {
        // If child is Younger, I am Elder Sister
        return 'Elder Sister';
      } else if (isBrother || isSister) {
        return 'Sister'; // Generic Sister
      } else if (isChild) {
        return 'Mother';
      } else if (isSpouse) {
        return 'Wife';
      } else if (isParent) {
        return 'Daughter';
      } else if (relation === 'Ashramam' || relation === 'Ashramam Member') {
        return 'Member';
      }
      return 'Daughter'; // Default for female
    }
  } else {
    // Parent is Male (default) - center node is male
    if (isTamil) {
      if (isElderBrother || isElderSister) {
        // If child is Elder, I am Younger Brother
        return 'தம்பி';
      } else if (isYoungerBrother || isYoungerSister) {
        // If child is Younger, I am Elder Brother
        return 'அண்ணன்';
      } else if (isBrother || isSister) {
        return 'சகோதரன்'; // Generic Brother
      } else if (isChild) {
        // For male parent, child relations: "அப்பா" (father)
        return 'அப்பா';
      } else if (isSpouse) {
        // For male parent, spouse relations: "கணவன்" (husband)
        return 'கணவன்';
      } else if (isParent) {
        // For male parent, parent relations: "மகன்" (son)
        return 'மகன்';
      } else if (relation === 'Ashramam' || relation === 'Ashramam Member') {
        // For Ashramam relations
        return 'உறுப்பினர்';
      }
      return 'மகன்'; // Default for male
    } else {
      if (isElderBrother || isElderSister) {
        // If child is Elder, I am Younger Brother
        return 'Younger Brother';
      } else if (isYoungerBrother || isYoungerSister) {
        // If child is Younger, I am Elder Brother
        return 'Elder Brother';
      } else if (isBrother || isSister) {
        return 'Brother'; // Generic Brother
      } else if (isChild) {
        return 'Father';
      } else if (isSpouse) {
        return 'Husband';
      } else if (isParent) {
        return 'Son';
      } else if (relation === 'Ashramam' || relation === 'Ashramam Member') {
        return 'Member';
      }
      return 'Son'; // Default for male
    }
  }
};

// Helper function to get relation label in Tamil/English
const getRelationLabel = (relation: string, isTamil: boolean = false): string => {
  if (isTamil) {
    const tamilMap: { [key: string]: string } = {
      'Father': 'அப்பா',
      'Mother': 'அம்மா',
      'Elder Brother': 'அண்ணன்',
      'Younger Brother': 'தம்பி',
      'Elder Sister': 'அக்கா',
      'Younger Sister': 'தங்கை',
      'Son': 'மகன்',
      'Daughter': 'மகள்',
      'Husband': 'கணவன்',
      'Wife': 'மனைவி',
      'Ashramam': 'ஆச்ரமம்',
      'Ashramam Member': 'ஆச்ரம உறுப்பினர்',
      'Brother': 'சகோதரன்',
      'Sister': 'சகோதரி'
    };
    return tamilMap[relation] || relation;
  }
  return relation;
};

// Updated: Function to get the complete arrow label: [ME label] – [RELATION label]
const getArrowLabel = (parentGender: string, relation: string, relationLabel: string, isTamil: boolean = false): string => {
  const meLabel = getMeLabel(parentGender, relation, isTamil);

  return `${meLabel} – ${relationLabel}`;
};

const getHexRadiusAtAngle = (angle: number, width: number, height: number) => {
  const r = Math.min(width, height) / 2;
  return r - 2 + (Math.abs(Math.sin(angle * 3)) * 6);
};

const HoneycombBackground = () => (
  <div className="absolute pointer-events-none overflow-visible" style={{ left: 0, top: 0 }}>
    <svg
      className="absolute overflow-visible opacity-[0.15]"
      style={{ left: -20000, top: -20000, width: 40000, height: 40000 }}
    >
      <defs>
        <pattern id="honeycomb" x="0" y="0" width="120" height="210" patternUnits="userSpaceOnUse">
          <path
            d="M60 0 L120 35 V105 L60 140 L0 105 V35 Z M0 140 L60 175 L120 140 M60 175 V210"
            fill="none"
            stroke="#6b7280"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect x="0" y="0" width="40000" height="40000" fill="url(#honeycomb)" />
    </svg>
  </div>
);

const GenealogyPage = () => {
  const { t, language } = useLanguage();
  const isTamil = language === 'ta';

  const [nodes, setNodes] = useState<{ [key: string]: UniverseNode }>({
    'root': {
      id: 'root',
      name: t('Self'),
      relation: 'Self',
      level: 0,
      parentId: null,
      position: { x: 0, y: 0 },
      isOpen: false,
      personId: 1,
      isUpdated: false
    }
  });

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    firstname: '',
    lastname: '',
    email: '',
    gender: 'M',
    phone: '',
    family_name: '',
    familyname1: ''
  });
  const [currentPerson, setCurrentPerson] = useState<PersonDetailResponse | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<UniverseNode | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showNameEditModal, setShowNameEditModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editingName, setEditingName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  const [isAddingRelative, setIsAddingRelative] = useState(false);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [addingPeopleName, setAddingPeopleName] = useState('');
  const [isSavingAddedPeople, setIsSavingAddedPeople] = useState(false);
  const [isLoadingRelations, setIsLoadingRelations] = useState(false);
  const [isLoadingPerson, setIsLoadingPerson] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.3 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const hasAutoExpanded = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartDist = useRef<number | null>(null);
  const touchStartCenter = useRef({ x: 0, y: 0 });
  const sidePanelScrollRef = useRef<HTMLDivElement>(null);

  // Track active invitations
  const [activeInvitations, setActiveInvitations] = useState<Array<{
    personId: number;
    personName: string;
    relation: string;
    timestamp: number;
    phoneNumber: string;
    fatherName?: string;
  }>>([]);

  // Add state for generation info
  const [generationInfo, setGenerationInfo] = useState<GenerationInfo | null>(null);
  const [isLoadingGenerationInfo, setIsLoadingGenerationInfo] = useState(false);

  // Add navigation history state
  const [navigationHistory, setNavigationHistory] = useState<NavigationHistoryItem[]>([
    {
      id: 'root',
      name: t('Self'),
      relation: 'Self',
      level: 0,
      timestamp: Date.now(),
      calculatedRelation: isTamil ? 'நான்' : 'Me'
    }
  ]);

  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(null);

  // Add search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [filteredButtons, setFilteredButtons] = useState<Array<{ id: number, label: string, image: string }>>([]);
  const [searchMobile, setSearchMobile] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mobileSearchResults, setMobileSearchResults] = useState<MobileSearchResult[]>([]);
  const [isSearchingMobile, setIsSearchingMobile] = useState(false);
  // NEW: State for main search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);

  // ============ NEW HOOKS FOR HOVER AUTOMATION ============
  const [hoverPath, setHoverPath] = useState<string[]>([]);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [hoverElement, setHoverElement] = useState<HTMLElement | null>(null);
  const [isCalculatingRelation, setIsCalculatingRelation] = useState(false);
  const hoverPathRef = useRef<string[]>([]);
  // ========================================================

  const topButtons = [
    { id: 1, label: isTamil ? 'உறவினர்\nபட்டியல்' : 'Relative\nList', image: relation1Img },
    { id: 2, label: isTamil ? 'பதிவிறக்க\nவசதிகள்' : 'Download\nOptions', image: connectImg },
    { id: 3, label: isTamil ? 'கலாச்சார\nபெட்டகம்' : 'Cultural\nBox', image: kalacharamImg },
    { id: 4, label: isTamil ? 'இருவருக்கான\nஉறவுமுறை\nபற்றி அறிய' : 'Know\nRelationship', image: mapImg },
    { id: 5, label: isTamil ? 'அரட்டை [Chat]' : 'Chat', image: connectionImg },
    { id: 6, label: isTamil ? 'அமைப்பு\n[Settings]' : 'Settings', image: settingImg },
  ];

  const [showSidePanel, setShowSidePanel] = useState(true);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Add refresh interval ref
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Disable body scroll when Genealogy page is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Function to convert relation code to Tamil
  const getTamilRelation = useCallback((relationCode: string): string => {
    const relationMap: { [key: string]: string } = {
      'father': 'அப்பா',
      'mother': 'அம்மா',
      'elder brother': 'அண்ணன்',
      'younger brother': 'தம்பி',
      'elder sister': 'அக்கா',
      'younger sister': 'தங்கை',
      'son': 'மகன்',
      'daughter': 'மகள்',
      'husband': 'கணவன்',
      'wife': 'மனைவி',
      'ashramam': 'ஆச்ரமம்',
      'ashramam member': 'ஆச்ரம உறுப்பினர்',
      'brother': 'சகோதரன்',
      'sister': 'சகோதரி',
      'self': 'தனக்கு',
      'me': 'நான்',
    };

    // Try exact match first
    const lowerCode = relationCode.toLowerCase().trim();
    if (relationMap[lowerCode]) {
      return relationMap[lowerCode];
    }

    // Try partial matches
    if (lowerCode.includes('father')) return 'அப்பா';
    if (lowerCode.includes('mother')) return 'அம்மா';
    if (lowerCode.includes('elder') && lowerCode.includes('brother')) return 'அண்ணன்';
    if (lowerCode.includes('younger') && lowerCode.includes('brother')) return 'தம்பி';
    if (lowerCode.includes('elder') && lowerCode.includes('sister')) return 'அக்கா';
    if (lowerCode.includes('younger') && lowerCode.includes('sister')) return 'தங்கை';
    if (lowerCode.includes('son')) return 'மகன்';
    if (lowerCode.includes('daughter')) return 'மகள்';
    if (lowerCode.includes('husband')) return 'கணவன்';
    if (lowerCode.includes('wife')) return 'மனைவி';
    if (lowerCode.includes('ashramam')) return 'ஆச்ரமம்';
    if (lowerCode.includes('brother')) return 'சகோதரன்';
    if (lowerCode.includes('sister')) return 'சகோதரி';

    return relationCode; // Fallback to original
  }, []);

  // ============ HOOVER RELATION CALCULATION FUNCTION ============
  const calculateRelationFromPath = useCallback(async (pathElements: string[]) => {
    if (pathElements.length === 0) return null;

    try {
      setIsCalculatingRelation(true);

      // Get current person ID (from root node)
      const fromPersonId = nodes['root']?.personId || currentPerson?.id || profile.id;

      if (!fromPersonId) {
        console.error("No from_person_id available");
        return null;
      }

      console.log("Calculating relation from path:", {
        from_person_id: fromPersonId,
        path: pathElements,
        lang: language
      });

      // Call backend relation calculation API
      const response = await api.post('api/relations/calculate-relation/', {
        from_person_id: fromPersonId,
        path: pathElements,
        context: {
          language: language,
          religion: profile.religion || '',
          caste: profile.caste || '',
          family_name: profile.familyname1 || '',
          include_tamil_path: true
        }
      });

      console.log("Relation calculation response:", response.data);

      if (response.data.success) {
        return response.data.result;
      }

      return null;
    } catch (error: any) {
      console.error('Error calculating relation from path:', error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return null;
    } finally {
      setIsCalculatingRelation(false);
    }
  }, [nodes, currentPerson, profile, language]);

  const getPathToNode = useCallback((node: UniverseNode) => {
    const path: string[] = [];
    let currentNode: UniverseNode | null = node;

    while (currentNode && currentNode.parentId && currentNode.id !== 'root') {
      path.unshift(currentNode.relation.toLowerCase());
      currentNode = nodes[currentNode.parentId];
    }
    return path;
  }, [nodes]);

  // ============ HOVER HANDLER FUNCTIONS ============
  const handleNodeHoverEnter = useCallback(async (node: UniverseNode, event: React.MouseEvent | React.TouchEvent) => {
    // Check if node is highlighted (active)
    const isHighlighted = !activeParentId ||
      node.id === activeParentId ||
      node.parentId === activeParentId;

    if (!isHighlighted) return;

    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout as any);
      setHoverTimeout(null);
    }

    // Get client coordinates safely for both mouse and touch events
    let clientX: number, clientY: number;

    if ('touches' in event) {
      // TouchEvent
      clientX = (event as React.TouchEvent).touches[0].clientX;
      clientY = (event as React.TouchEvent).touches[0].clientY;
    } else {
      // MouseEvent
      clientX = (event as React.MouseEvent).clientX;
      clientY = (event as React.MouseEvent).clientY;
    }

    // If this is a root node or active parent, show simple info
    if (node.id === 'root' || node.id === activeParentId) {
      setHoverInfo({
        label: node.name,
        englishLabel: node.relation,
        explanation: isTamil ? 'நீங்கள் இப்போது இங்கே இருக்கிறீர்கள்' : 'You are currently here',
        path: [],
        fromPersonName: nodes['root']?.name || 'You',
        isLoading: false,
        position: { x: clientX, y: clientY }
      });
      return;
    }

    // Store the element for positioning
    if (event.currentTarget) {
      setHoverElement(event.currentTarget as HTMLElement);
    }

    // Calculate the path from root to this node
    const path = getPathToNode(node);

    console.log("Calculated hover path:", path);
    hoverPathRef.current = path;
    setHoverPath(path);

    // Set loading state
    setHoverInfo({
      label: '...',
      englishLabel: 'Calculating...',
      explanation: 'Finding relationship...',
      path: path,
      fromPersonName: nodes['root']?.name || 'You',
      isLoading: true,
      position: { x: clientX, y: clientY }
    });

    // Set a timeout to calculate relation after 300ms (debounce)
    const timeout = setTimeout(async () => {
      try {
        const result = await calculateRelationFromPath(path);

        if (result) {
          // Create Tamil path for the explanation
          const tamilPath = path.map(step => getTamilRelation(step));

          setHoverInfo({
            label: result.label || getRelationLabel(node.relation, isTamil),
            englishLabel: result.english_label || node.relation,
            explanation: result.explanation ||
              (isTamil
                ? `${tamilPath.join(' → ')} உறவுமுறை`
                : `Relationship: ${path.join(' → ')}`),
            path: path,
            fromPersonName: nodes['root']?.name || 'You',
            isLoading: false,
            position: { x: clientX, y: clientY }
          });
        } else {
          // Fallback to simple relation
          const relationPath = path.length > 0
            ? path.join(' → ')
            : 'Direct relation';

          // Create Tamil path for fallback
          const tamilPath = path.map(step => getTamilRelation(step)).join(' → ');

          setHoverInfo({
            label: getRelationLabel(node.relation, isTamil),
            englishLabel: node.relation,
            explanation: isTamil
              ? `${tamilPath} உறவுமுறை`
              : `Relationship: ${relationPath}`,
            path: path,
            fromPersonName: nodes['root']?.name || 'You',
            isLoading: false,
            position: { x: clientX, y: clientY }
          });
        }
      } catch (error) {
        console.error("Error in hover calculation:", error);
        // Fallback to simple relation
        const tamilPath = path.map(step => getTamilRelation(step)).join(' → ');

        setHoverInfo({
          label: getRelationLabel(node.relation, isTamil),
          englishLabel: node.relation,
          explanation: isTamil
            ? `${tamilPath || 'உறவுமுறை கணக்கிட முடியவில்லை'}`
            : 'Could not calculate relationship',
          path: path,
          fromPersonName: nodes['root']?.name || 'You',
          isLoading: false,
          position: { x: clientX, y: clientY }
        });
      }
    }, 300);

    setHoverTimeout(timeout);
  }, [calculateRelationFromPath, isTamil, nodes, activeParentId, hoverTimeout, getTamilRelation]);

  const handleNodeHoverLeave = useCallback(() => {
    // Clear timeout if still pending
    if (hoverTimeout) {
      clearTimeout(hoverTimeout as any);
      setHoverTimeout(null);
    }

    // Reset hover path and info
    hoverPathRef.current = [];
    setHoverPath([]);
    setHoverInfo(null);
    setHoverElement(null);
  }, [hoverTimeout]);

  // Handle touch start for mobile devices
  const handleNodeTouchStart = useCallback((node: UniverseNode, event: React.TouchEvent) => {
    event.preventDefault();
    handleNodeHoverEnter(node, event);
  }, [handleNodeHoverEnter]);

  // Handle touch end for mobile devices
  const handleNodeTouchEnd = useCallback(() => {
    handleNodeHoverLeave();
  }, [handleNodeHoverLeave]);

  // ============ HOVER TOOLTIP COMPONENT ============
  const HoverTooltip = () => {
    if (!hoverInfo) return null;

    // Get Tamil path
    const tamilPath = hoverInfo.path.map(step => getTamilRelation(step));

    // Calculate position for tooltip
    const tooltipStyle: React.CSSProperties = {
      position: 'fixed' as const,
      zIndex: 1000,
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
      padding: '16px',
      minWidth: '280px',
      maxWidth: '320px',
      pointerEvents: 'none' as const,
      transition: 'opacity 0.2s, transform 0.2s',
    };

    // Position near the mouse or hovered element
    if (hoverElement && hoverInfo.position) {
      const rect = hoverElement.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
        const top = rect.top - containerRect.top - 120;
        const left = rect.left - containerRect.left + (rect.width / 2);

        tooltipStyle.top = `${top}px`;
        tooltipStyle.left = `${left}px`;
        tooltipStyle.transform = 'translateX(-50%)';
      }
    } else if (hoverInfo.position) {
      // Follow mouse
      tooltipStyle.top = `${hoverInfo.position.y - 150}px`;
      tooltipStyle.left = `${hoverInfo.position.x}px`;
      tooltipStyle.transform = 'translateX(-50%)';
    }

    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="fixed z-100 border border-gray-300 rounded-xl shadow-2xl p-4 min-w-70 max-w-[320px] pointer-events-none backdrop-blur-sm bg-white/95" style={tooltipStyle}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Info size={20} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-lg truncate">
              {hoverInfo.isLoading ? (isTamil ? 'கணக்கிடுகிறது...' : 'Calculating...') : hoverInfo.label}
            </h3>

          </div>
        </div>

        {/* Path visualization - Show Tamil path for Tamil language, English path for English language */}
        {hoverInfo.path.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs font-medium text-gray-500 mb-2">
              {isTamil ? `${hoverInfo.fromPersonName} ன் பாதை:` : `Path from ${hoverInfo.fromPersonName}:`}
            </div>

            {/* Show Tamil path only when language is Tamil */}
            {isTamil && tamilPath.length > 0 && (
              <div className="flex items-center justify-center gap-2 flex-wrap mb-2">
                {tamilPath.map((step, index) => (
                  <React.Fragment key={`tamil-${index}`}>
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {step}
                    </div>
                    {index < tamilPath.length - 1 && (
                      <ArrowRight size={12} className="text-gray-400" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Show English path only when language is English */}
            {!isTamil && (
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {hoverInfo.path.map((step, index) => (
                  <React.Fragment key={`english-${index}`}>
                    <div className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                      {step}
                    </div>
                    {index < hoverInfo.path.length - 1 && (
                      <ArrowRight size={12} className="text-gray-300" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}


          </div>
        )}

        {/* Explanation - Show in current language */}
        <div className="text-sm text-gray-700 mb-3">
          {isTamil ?
            (hoverInfo.isLoading ? 'உறவுமுறை கண்டறியப்படுகிறது...' :
              hoverInfo.explanation.includes('உறவுமுறை') ? hoverInfo.explanation :
                `${hoverInfo.explanation} உறவுமுறை`)
            : hoverInfo.explanation}
        </div>

        {/* Loading indicator */}
        {hoverInfo.isLoading && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            {isTamil ? 'உறவுமுறை கணக்கிடுகிறது...' : 'Calculating relationship...'}
          </div>
        )}

        {/* Tip */}

      </motion.div>
    );
  };

  // Handle search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = topButtons.filter(button =>
        button.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (isTamil ? button.label.toLowerCase().includes(searchQuery.toLowerCase()) : false)
      );
      setFilteredButtons(filtered);
      setShowSearchResults(filtered.length > 0);
    } else {
      setFilteredButtons([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, isTamil]);

  // Function to fetch generation info
  const fetchGenerationInfo = useCallback(async (personId: number) => {
    if (!personId) return;

    try {
      setIsLoadingGenerationInfo(true);
      console.log(`Fetching generation info for person ${personId}`);

      const response = await api.get(`/api/genealogy/person/${personId}/generation-info/`);

      console.log("Generation info response:", response.data);
      setGenerationInfo(response.data);
    } catch (error) {
      console.error("Error fetching generation info:", error);
      // Don't show error toast as this is a supplementary feature
    } finally {
      setIsLoadingGenerationInfo(false);
    }
  }, []);

  const addToNavigationHistory = useCallback((node: UniverseNode, calcRel?: string) => {
    setNavigationHistory(prev => {
      // Check if this node is already in history (avoid duplicates)
      const existingIndex = prev.findIndex(item => item.id === node.id);

      if (existingIndex !== -1) {
        // If found, update its calculatedRelation if provided, otherwise just return the sliced history (going back)
        if (calcRel) {
          const newHistory = [...prev];
          newHistory[existingIndex] = {
            ...newHistory[existingIndex],
            calculatedRelation: calcRel
          };
          return newHistory;
        }
        return prev.slice(0, existingIndex + 1);
      }

      // Determine arrow label from parent in history to this node
      let arrowLabel = node.arrowLabel;

      // If no arrow label on node, try to generate it
      if (!arrowLabel && prev.length > 0) {
        const lastItem = prev[prev.length - 1];
        const lastNode = nodes[lastItem.id];
        if (lastNode) {
          arrowLabel = getArrowLabel(
            lastNode.gender || 'M',
            node.relation,
            getRelationLabel(node.relation, isTamil),
            isTamil
          );
        }
      }

      // Add new item to history
      return [...prev, {
        id: node.id,
        name: node.name,
        relation: node.relation,
        personId: node.personId,
        level: node.level,
        timestamp: Date.now(),
        arrowLabel: arrowLabel,
        calculatedRelation: calcRel
      }];
    });
  }, [nodes, isTamil]);

  // ============ UPDATED: Function to navigate to a specific point in history ============
  const navigateToHistoryItem = useCallback(async (item: NavigationHistoryItem, index: number) => {
    if (index === navigationHistory.length - 1) return; // Already at this item

    // Find the node in the current nodes
    const targetNode = nodes[item.id];

    if (targetNode) {
      console.log(`Navigating to history item: ${item.id} (${item.name}) at index ${index}`);

      // First, update the navigation history to show only up to this point
      setNavigationHistory(prev => prev.slice(0, index + 1));

      // Set this node as the active parent (for highlighting)
      setActiveParentId(targetNode.id);

      // Center the view on this node - ZOOM IN to 0.8
      setTransform({
        x: -targetNode.position.x * 0.8,
        y: -targetNode.position.y * 0.8,
        scale: 0.8
      });

      // Check if this node is already open with its children
      const hasChildren = Object.values(nodes).some(n => n.parentId === targetNode.id);

      // If node doesn't have children or isn't open, expand it
      if (!targetNode.isOpen || !hasChildren) {
        console.log(`Expanding node ${targetNode.id} from navigation`);

        // Handle expansion based on node type
        if (targetNode.id === 'root') {
          // For root node, expand with its gender
          expandNode('root', targetNode.gender);
        } else if (targetNode.relation === 'Ashramam') {
          // For Ashramam, use special expansion
          expandAshramam(targetNode.id);
        } else if (targetNode.isConnected && targetNode.personId) {
          // For connected nodes, load their next flow
          try {
            const response = await genealogyService.getNextFlow(targetNode.personId);
            const nextPerson = (response as any).person;
            const nextRelations = (response as any).existing_relations;
            const permissions = (response as any).permissions;

            if (nextPerson) {
              const personName = (nextPerson.full_name || nextPerson.name || targetNode.name).toUpperCase();
              const personGender = nextPerson.gender || 'F';

              setNodes(prev => ({
                ...prev,
                [targetNode.id]: {
                  ...prev[targetNode.id],
                  isOpen: true,
                  name: personName,
                  personId: nextPerson.id,
                  isUpdated: true,
                  isConnected: permissions?.is_connected,
                  isReadOnly: permissions?.is_readonly
                }
              }));

              if (nextRelations) {
                buildNodesFromRelationsForNextFlow(response, personGender, targetNode.id);
              }

              fetchGenerationInfo(nextPerson.id);
            }
          } catch (e) {
            console.error("Error in next flow:", e);
            toast.error("Failed to load connected person");

            // Fallback to default expansion
            expandNode(targetNode.id, targetNode.gender);
          }
        } else if (targetNode.personId) {
          // For nodes with personId but not connected, fetch their relations
          try {
            const relationsData = await genealogyService.getPersonRelations(targetNode.personId);

            setNodes(prev => {
              const nextNodes = { ...prev };

              // First, mark this node as open
              if (nextNodes[targetNode.id]) {
                nextNodes[targetNode.id] = { ...nextNodes[targetNode.id], isOpen: true };
              }

              return nextNodes;
            });

            // Build nodes from relations
            buildNodesFromRelations(relationsData, targetNode.gender, targetNode.id);

            // Fetch generation info for this person
            if (targetNode.personId) {
              fetchGenerationInfo(targetNode.personId);
            }
          } catch (error) {
            console.error(`Error fetching relations for person ${targetNode.personId}:`, error);
            // Fallback to default expansion
            expandNode(targetNode.id, targetNode.gender);
          }
        } else {
          // For placeholder nodes, create default relations
          expandNode(targetNode.id, targetNode.gender);
        }
      } else {
        // Node is already open, just ensure it's properly centered and highlighted
        console.log(`Node ${targetNode.id} already has children, just updating view`);

        // If this is a node with personId but not the root, fetch generation info
        if (targetNode.personId && targetNode.id !== 'root') {
          fetchGenerationInfo(targetNode.personId);
        }
      }

      // Show success message
      toast.success(`Navigated to ${targetNode.name} (Generation ${targetNode.level})`);
    } else {
      console.error(`Target node ${item.id} not found in current nodes`);

      // If node not found, we might need to reload from personId
      if (item.personId) {
        try {
          toast.loading(`Loading ${item.name}...`, { id: 'nav-loading' });

          // Fetch person details
          const personData = await genealogyService.getPersonDetails(item.personId);

          if (personData) {
            // Create a new node for this person
            const newNode: UniverseNode = {
              id: `nav-${personData.id}`,
              name: personData.full_name.toUpperCase(),
              relation: item.relation,
              level: item.level,
              parentId: null,
              position: { x: 0, y: 0 }, // Will be positioned by build function
              isOpen: true,
              gender: personData.gender,
              personId: personData.id,
              isUpdated: true
            };

            // Fetch relations
            const relationsData = await genealogyService.getPersonRelations(personData.id);

            // Update nodes with this as the new root for this view
            setNodes({
              [newNode.id]: newNode
            });

            // Build relations around this node
            buildNodesFromRelations(relationsData, personData.gender, newNode.id);

            // Set as active parent
            setActiveParentId(newNode.id);

            // Center view - ZOOM IN to 0.8
            setTransform({ x: 0, y: 0, scale: 0.8 });

            // Update navigation history
            setNavigationHistory(prev => {
              const newHistory = prev.slice(0, index);
              return [...newHistory, {
                id: newNode.id,
                name: newNode.name,
                relation: newNode.relation,
                personId: newNode.personId,
                level: newNode.level,
                timestamp: Date.now(),
                arrowLabel: item.arrowLabel
              }];
            });

            toast.success(`Loaded ${personData.full_name}`, { id: 'nav-loading' });
          }
        } catch (error) {
          console.error("Error loading person from history:", error);
          toast.error("Failed to load person", { id: 'nav-loading' });
        }
      }
    }
  }, [nodes, navigationHistory.length, fetchGenerationInfo]);

  // ============ NEW: useEffect to sync view when navigation history changes ============
  useEffect(() => {
    // When navigation history changes (especially when going back via buttons),
    // ensure the active parent is set to the current node
    if (navigationHistory.length > 0) {
      const currentItem = navigationHistory[navigationHistory.length - 1];
      const currentNode = nodes[currentItem.id];

      if (currentNode) {
        console.log(`History changed, setting active parent to: ${currentNode.id}`);
        setActiveParentId(currentNode.id);

        // Center view on current node - ZOOM IN to 0.8
        setTransform({
          x: -currentNode.position.x * 0.8,
          y: -currentNode.position.y * 0.8,
          scale: 0.8
        });

        // If this node has a personId but isn't expanded, ensure we fetch its data
        if (currentNode.personId && currentNode.id !== 'root' && !currentNode.isOpen) {
          // Check if node has children
          const hasChildren = Object.values(nodes).some(n => n.parentId === currentNode.id);

          if (!hasChildren) {
            console.log(`Auto-expanding node ${currentNode.id} from history change`);

            if (currentNode.isConnected) {
              // For connected nodes, load next flow
              genealogyService.getNextFlow(currentNode.personId)
                .then(response => {
                  const nextPerson = (response as any).person;
                  if (nextPerson) {
                    setNodes(prev => ({
                      ...prev,
                      [currentNode.id]: {
                        ...prev[currentNode.id],
                        isOpen: true
                      }
                    }));

                    if ((response as any).existing_relations) {
                      buildNodesFromRelationsForNextFlow(
                        response,
                        currentNode.gender || 'M',
                        currentNode.id
                      );
                    }
                  }
                })
                .catch(err => console.error("Error auto-expanding node:", err));
            } else {
              // For regular nodes, fetch relations
              genealogyService.getPersonRelations(currentNode.personId)
                .then(relationsData => {
                  setNodes(prev => ({
                    ...prev,
                    [currentNode.id]: {
                      ...prev[currentNode.id],
                      isOpen: true
                    }
                  }));
                  buildNodesFromRelations(relationsData, currentNode.gender, currentNode.id);
                })
                .catch(err => console.error("Error auto-expanding node:", err));
            }
          }
        }
      }
    }
  }, [navigationHistory, nodes]);

  // ============ UPDATED: Debounced mobile search for the modal using /api/auth/api/mobile-search/ ============
  useEffect(() => {
    const searchMobileNumber = async () => {
      if (phoneNumber.length >= 3) {
        setIsSearchingMobile(true);
        try {
          // Call the mobile search API endpoint
          const response = await api.get(`/api/auth/api/mobile-search/`, {
            params: { q: phoneNumber }
          });

          // The API returns { results: [...], total: number, query: string }
          if (response.data && response.data.results) {
            setMobileSearchResults(response.data.results);
          } else {
            setMobileSearchResults([]);
          }
        } catch (error) {
          console.error("Error searching mobile numbers:", error);
          setMobileSearchResults([]);
        } finally {
          setIsSearchingMobile(false);
        }
      } else {
        setMobileSearchResults([]);
      }
    };

    const timer = setTimeout(searchMobileNumber, 500);
    return () => clearTimeout(timer);
  }, [phoneNumber]);

  // NEW: Debounced search for MAIN search bar using genealogy API
  useEffect(() => {
    const searchMain = async () => {
      // Trim and remove non-digits if searching by number, or just trim if name? 
      // The API endpoint seems to support "q" parameter which can be anything.
      // But the user request specifically says "search mobile no".
      // The example request is "?q=612".

      if (searchMobile.trim().length >= 3) {
        // Don't set isSearching to true here locally as it might cause UI flicker with the spinner
        // just let it fetch quietly for suggestions
        try {
          const response = await genealogyService.searchPersons(searchMobile);
          if (response.success && response.suggestions && response.suggestions.length > 0) {
            setSearchSuggestions(response.suggestions);
          } else {
            // NEW: Show "No user found" as a disabled suggestion
            setSearchSuggestions([{
              id: -1,
              full_name: isTamil ? 'பயனர் யாரும் இல்லை' : 'No user found',
              mobile_number: '',
              relation_label: ''
            }]);
          }
        } catch (error) {
          console.error("Error searching persons:", error);
          // Show error/no found state
          setSearchSuggestions([{
            id: -1,
            full_name: isTamil ? 'பயனர் யாரும் இல்லை' : 'No user found',
            mobile_number: '',
            relation_label: ''
          }]);
        }
      } else {
        setSearchSuggestions([]);
      }
    };

    const timer = setTimeout(searchMain, 300); // Debounce 300ms
    return () => clearTimeout(timer);
  }, [searchMobile, isTamil]);

  // NEW: Handle clicking a suggestion
  const handleSuggestionClick = async (suggestion: any) => {
    // If it's a "no user found" item, do nothing
    if (suggestion.id === -1) {
      return;
    }

    setSearchMobile('');
    setSearchSuggestions([]); // Clear suggestions

    try {
      setIsSearching(true);
      toast.loading(isTamil ? `${suggestion.full_name} தேடுகிறது...` : `Loading ${suggestion.full_name}...`, { id: 'search-nav' });

      // Fetch full details
      const personData = await genealogyService.getPersonDetails(suggestion.id);

      if (personData) {
        toast.success(isTamil ? `${personData.full_name} கண்டறியப்பட்டார்` : `Found: ${personData.full_name}`, { id: 'search-nav' });

        // Navigate to this person - Make them the ROOT of the view
        const newNode: UniverseNode = {
          id: 'root', // ID MUST be root to be the center
          name: personData.full_name.toUpperCase(),
          relation: 'Self',
          level: 0,
          parentId: null,
          position: { x: 0, y: 0 },
          isOpen: true,
          personId: personData.id,
          isUpdated: true,
          gender: personData.gender,
          image: personData.image
        };

        // Fetch relations
        const relationsData = await genealogyService.getPersonRelations(personData.id);

        // Update nodes - RESET everything to just this new person and their relations
        setNodes({
          'root': newNode
        });

        // Build relations around this new root
        buildNodesFromRelations(relationsData, personData.gender, 'root');
        setActiveParentId('root');

        // Center view - ZOOM IN 
        setTransform({ x: 0, y: 0, scale: 0.8 });

        // Update navigation history
        setNavigationHistory(prev => {
          return [...prev, {
            id: 'root', // Must match the node ID
            name: newNode.name,
            relation: 'Search Result',
            personId: newNode.personId,
            level: 0,
            timestamp: Date.now()
          }];
        });

        // Also fetch generation info for this new person
        fetchGenerationInfo(personData.id);

      }
    } catch (error) {
      console.error("Navigation error:", error);
      toast.error(isTamil ? 'நபரை ஏற்ற முடியவில்லை' : 'Failed to load person', { id: 'search-nav' });
    } finally {
      setIsSearching(false);
    }
  };

  // ============ UPDATED: Handle mobile search using the new API ============
  const handleMobileSearch = async (overridePhone?: string) => {
    const phoneToSearch = overridePhone || phoneNumber;
    if (!phoneToSearch.trim()) {
      toast.error(isTamil ? 'தயவுசெய்து மொபைல் எண்ணை உள்ளிடவும்' : 'Please enter a mobile number');
      return;
    }

    const cleanedPhone = phoneToSearch.replace(/\D/g, '');
    if (cleanedPhone.length < 3) {
      toast.error(isTamil ? 'குறைந்தது 3 எண்களை உள்ளிடவும்' : 'Please enter at least 3 digits');
      return;
    }

    try {
      setIsSearching(true);

      // Use the new mobile search API
      const response = await api.get(`/api/auth/api/mobile-search/`, {
        params: { q: cleanedPhone }
      });

      const results = response.data?.results || [];

      if (results && results.length > 0) {
        // Use the first result as the target user
        const targetUser = results[0];

        toast.loading(isTamil ? 'பயனர் தகவலை ஏற்றுகிறது...' : 'Loading user information...', { id: 'search-loading' });

        try {
          // Try to get person details using the user ID
          const personData = await genealogyService.getPersonDetails(targetUser.id);

          if (personData) {
            toast.success(isTamil ? `${personData.full_name} கண்டறியப்பட்டார்` : `Found: ${personData.full_name}`, { id: 'search-loading' });

            // Navigate to this person
            const newNode: UniverseNode = {
              id: `search-${personData.id}`,
              name: personData.full_name.toUpperCase(),
              relation: 'Search Result',
              level: 0,
              parentId: null,
              position: { x: 0, y: 0 }, // We'll center the view
              isOpen: true,
              personId: personData.id,
              isUpdated: true,
              gender: personData.gender,
              image: personData.image
            };

            // Fetch their relations
            const relationsData = await genealogyService.getPersonRelations(personData.id);

            // Update nodes to show this person's tree
            setNodes({
              [newNode.id]: newNode
            });

            buildNodesFromRelations(relationsData, personData.gender, newNode.id);
            setActiveParentId(newNode.id);

            // Update transform to center - ZOOM IN to 0.8
            setTransform({ x: 0, y: 0, scale: 0.8 });

            // Clear search
            setPhoneNumber('');
            setMobileSearchResults([]);
            setShowPhoneModal(false);
            setShowModal(false);
          } else {
            toast.error(isTamil ? 'நபர் விவரங்களை கண்டறிய முடியவில்லை' : 'Could not find person details', { id: 'search-loading' });
          }
        } catch (error) {
          console.error("Error fetching person details:", error);
          toast.error(isTamil ? 'நபர் விவரங்களை ஏற்ற முடியவில்லை' : 'Failed to load person details', { id: 'search-loading' });
        }
      } else {
        toast.error(isTamil ? 'இந்த எண் பதிவேட்டில் இல்லை' : 'Mobile number not found in directory', { id: 'search-loading' });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error(isTamil ? 'தேடலில் தோல்வி' : 'Search failed', { id: 'search-loading' });
    } finally {
      setIsSearching(false);
    }
  };

  const goToRoot = useCallback(() => {
    if (navigationHistory.length > 0) {
      navigateToHistoryItem(navigationHistory[0], 0);
      toast.success(isTamil ? 'தொடக்கத்திற்கு சென்றது' : 'Returned to start');
    }
  }, [navigationHistory, navigateToHistoryItem, isTamil]);

  const handleBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const prevIndex = navigationHistory.length - 2;
      navigateToHistoryItem(navigationHistory[prevIndex], prevIndex);
    }
  }, [navigationHistory, navigateToHistoryItem]);

  // Get filtered relations based on gender
  const getFilteredRelations = useCallback((parentGender?: string) => {
    // Prioritize parentGender (passed from node), then profile gender, then current person gender
    const rawGender = parentGender || (profile.gender || currentPerson?.gender || 'M');

    let genderToTest = 'M';
    if (typeof rawGender === 'string') {
      const g = rawGender.trim().toUpperCase();
      if (g.startsWith('F')) genderToTest = 'F';
      else if (g.startsWith('M')) genderToTest = 'M';
    }

    const filtered = ALL_RELATIONS.filter(rel => {
      // If user is Male (M), remove Husband option
      if (genderToTest === 'M' && rel === 'Husband') return false;
      // If user is Female (F), remove Wife option
      if (genderToTest === 'F' && rel === 'Wife') return false;
      return true;
    });

    // Return all items (up to 11) to include Husband/Wife correctly
    return filtered;
  }, [currentPerson?.gender, profile.gender]);

  // Create default relations for a node
  const createDefaultRelationsForNode = useCallback((nodeId: string, nodeGender: string) => {
    console.log(`Creating default relations for ${nodeId} with gender ${nodeGender}`);

    setNodes(prev => {
      const node = prev[nodeId];
      if (!node) {
        console.log(`Node ${nodeId} not found`);
        return prev;
      }

      console.log(`Node found: ${node.name}, level: ${node.level}`);

      const nextNodes = { ...prev };
      const relations = getFilteredRelations(nodeGender);
      const radius = RADIUS_BASE;

      console.log(`Filtered relations:`, relations);

      relations.forEach((rel, i) => {
        const angle = (i * (360 / 10)) * (Math.PI / 180);
        const childId = `${nodeId}-default-${i}`;
        const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(rel) ? 'F' : 'M';

        if (!nextNodes[childId]) {
          nextNodes[childId] = {
            id: childId,
            name: rel, // Simplified: just 'Father', 'Mother', etc.
            relation: rel,
            relationLabel: getRelationLabel(rel, isTamil),
            level: node.level + 1,
            parentId: nodeId,
            position: {
              x: node.position.x + Math.cos(angle) * radius,
              y: node.position.y + Math.sin(angle) * radius
            },
            isOpen: false,
            gender: childGender,
            isUpdated: false,
            isConnected: false // Placeholder nodes are not connected
          };

          console.log(`Created default node: ${childId} - ${rel}`);
        }
      });

      return nextNodes;
    });
  }, [getFilteredRelations, isTamil]);

  // Fetch person details using ID
  const fetchPersonDetails = useCallback(async (personId: number) => {
    try {
      setIsLoadingPerson(true);
      console.log(`Fetching person details for ID: ${personId}`);

      const personData = await genealogyService.getPersonDetails(personId);
      console.log("Person details:", personData);

      setCurrentPerson(personData);

      // Update root node with person data
      setNodes(prev => ({
        ...prev,
        'root': {
          ...prev['root'],
          name: personData.full_name.toUpperCase() || 'YOU',
          gender: personData.gender || 'M',
          personId: personData.id,
          image: getFullImageUrl(personData.image) // Ensure image is linked
        }
      }));

      return personData;
    } catch (error) {
      console.error(`Error fetching person details for ID ${personId}:`, error);
      return null;
    } finally {
      setIsLoadingPerson(false);
    }
  }, []);

  // Fetch existing relations
  const fetchExistingRelations = useCallback(async (personId: number) => {
    if (!personId || isLoadingRelations) return;

    try {
      setIsLoadingRelations(true);
      console.log("Fetching existing relations for person:", personId);
      const relationsData = await genealogyService.getPersonRelations(personId);
      console.log("Existing relations data:", relationsData);

      // Build nodes from existing relations
      buildNodesFromRelations(relationsData);
    } catch (error) {
      console.error("Error fetching existing relations:", error);
    } finally {
      setIsLoadingRelations(false);
    }
  }, [isLoadingRelations]);

  // Build nodes from API relations - Generic for any source node
  const buildNodesFromRelations = useCallback((relationsData: PersonRelationsResponse, overrideGender?: string, sourceNodeId: string = 'root') => {
    console.log(`Building nodes for ${sourceNodeId} from API relations + merging placeholders`);

    setNodes(prev => {
      // 1. Filter out all existing children of this sourceNodeId to prevent duplicates/orphans
      const cleanedNodes: { [key: string]: UniverseNode } = {};
      Object.entries(prev).forEach(([id, node]) => {
        if (node.parentId !== sourceNodeId) {
          cleanedNodes[id] = node;
        }
      });

      const sourceNode = cleanedNodes[sourceNodeId];
      if (!sourceNode) return prev;

      const currentGender = overrideGender || sourceNode.gender || (sourceNodeId === 'root' ? (profile.gender || 'M') : 'M');
      const baseRelations = getFilteredRelations(currentGender);
      const apiOutgoing = relationsData.outgoing || [];
      const apiIncoming = relationsData.incoming || [];
      const allApi = [...apiOutgoing, ...apiIncoming];

      // Group API relations by their UI relation name
      const groupedApi: { [key: string]: typeof allApi } = {};
      allApi.forEach(rel => {
        const isOutgoing = String(rel.from_person) === String(sourceNode.personId);
        let uiRel = mapAPIToUIRelation(rel.relation_code);

        if (isOutgoing) {
          // Outgoing relation (Root -> Other). The code (e.g. FATHER) describes the ROOT's role.
          // We need to invert it to show the Other person's role (e.g. Son/Daughter).
          let leafGender = (rel as any).brick_person_gender ||
            (rel as any).to_person_info?.gender ||
            (rel as any).to_person_gender ||
            (rel as any).gender || 'M';

          if ((rel as any).brick_person_id === rel.to_person) {
            leafGender = (rel as any).brick_person_gender || leafGender;
          }
          if (rel.to_person === profile.id) {
            leafGender = profile.gender || leafGender;
          }

          uiRel = getInverseRelation(uiRel, leafGender);
        }

        if (!groupedApi[uiRel]) groupedApi[uiRel] = [];
        groupedApi[uiRel].push(rel);
      });

      const nodesToCreate: any[] = [];
      const usedApiIds = new Set<string>();

      baseRelations.forEach(relType => {
        const matches = groupedApi[relType] || [];
        if (matches.length > 0) {
          matches.forEach(match => {
            const isOutgoing = String(match.from_person) === String(sourceNode.personId);
            const personId = isOutgoing ? match.to_person : match.from_person;
            const personName = isOutgoing ? match.to_person_name : match.from_person_name;
            const relationLabel = getDisplayLabel(match.relation_label);

            // Track this relation as used
            const matchId = `${match.from_person}-${match.to_person}-${match.relation_code}`;
            usedApiIds.add(matchId);

            // IMPORTANT: Check if this person is connected (has linked user)
            const isConnected = !!(match as any).to_person_info?.linked_user ||
              !!(match as any).from_person_info?.linked_user ||
              (match as any).is_connected ||
              (match as any).status === 'confirmed' ||
              (match as any).linked_user !== null ||
              (match as any).to_person_info?.id !== undefined ||
              (match as any).from_person_info?.id !== undefined;

            nodesToCreate.push({
              name: personName.toUpperCase(),
              relation: relType,
              relationLabel: relationLabel,
              arrowLabel: (match as any).arrow_label || (match as any).relation_label?.arrow_label,
              gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M',
              personId: personId,
              isUpdated: true,
              isConnected: isConnected, // Set based on actual connection status
              isReadOnly: relationsData.permissions?.is_readonly,
              image: getFullImageUrl((match as any).image || (match as any).person?.image || (match as any).to_person_info?.image || (match as any).from_person_info?.image)
            });
          });
        } else {
          // Placeholder - NOT CONNECTED
          const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M';
          nodesToCreate.push({
            name: relType,
            relation: relType,
            relationLabel: getRelationLabel(relType, isTamil),
            gender: childGender,
            isUpdated: false,
            isConnected: false, // Placeholders are not connected
            isReadOnly: relationsData.permissions?.is_readonly
          });
        }
      });

      // ADD LEFTOVER RELATIONS: Any API relation that didn't match the 11 slots
      allApi.forEach(rel => {
        const matchId = `${rel.from_person}-${rel.to_person}-${rel.relation_code}`;
        if (!usedApiIds.has(matchId)) {
          const isOutgoing = String(rel.from_person) === String(sourceNode.personId);
          let uiRel = mapAPIToUIRelation(rel.relation_code);

          if (isOutgoing) {
            let leafGender = (rel as any).brick_person_gender ||
              (rel as any).to_person_info?.gender ||
              (rel as any).to_person_gender ||
              (rel as any).gender || 'M';

            if ((rel as any).brick_person_id === rel.to_person) {
              leafGender = (rel as any).brick_person_gender || leafGender;
            }
            if (rel.to_person === profile.id) {
              leafGender = profile.gender || leafGender;
            }

            uiRel = getInverseRelation(uiRel, leafGender);
          }

          const relationLabel = getDisplayLabel(rel.relation_label);

          // IMPORTANT: Check if this person is connected (has linked user)
          const isConnected = !!(rel as any).to_person_info?.linked_user ||
            !!(rel as any).from_person_info?.linked_user ||
            (rel as any).is_connected ||
            (rel as any).status === 'confirmed' ||
            (rel as any).linked_user !== null ||
            (rel as any).to_person_info?.id !== undefined ||
            (rel as any).from_person_info?.id !== undefined;

          const personId = isOutgoing ? rel.to_person : rel.from_person;
          const personName = isOutgoing ? rel.to_person_name : rel.from_person_name;

          nodesToCreate.push({
            name: personName.toUpperCase(),
            relation: uiRel,
            relationLabel: relationLabel,
            arrowLabel: (rel as any).arrow_label || (rel as any).relation_label?.arrow_label,
            gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(uiRel) ? 'F' : 'M',
            personId: personId,
            isUpdated: true,
            isConnected: isConnected, // Set based on actual connection status
            isReadOnly: relationsData.permissions?.is_readonly,
            image: getFullImageUrl((rel as any).image || (rel as any).person?.image || (rel as any).to_person_info?.image || (rel as any).from_person_info?.image)
          });
          usedApiIds.add(matchId);
        }
      });

      // Layout calculations
      const count = nodesToCreate.length;
      const baseRadius = sourceNodeId === 'root' ? RADIUS_BASE : RADIUS_BASE * 0.85;
      const radius = baseRadius * (count > 11 ? Math.sqrt(count / 11) : 1);

      nodesToCreate.forEach((nodeData, i) => {
        const nodeId = `${sourceNodeId}-child-${i}`;
        const angle = (i * (360 / Math.max(count, 1))) * (Math.PI / 180);

        cleanedNodes[nodeId] = {
          id: nodeId,
          ...nodeData,
          level: sourceNode.level + 1,
          parentId: sourceNodeId,
          position: {
            x: sourceNode.position.x + Math.cos(angle) * radius,
            y: sourceNode.position.y + Math.sin(angle) * radius
          },
          isOpen: false
        };
      });

      console.log(`Finished building ${count} nodes for ${sourceNodeId}`);

      // Update source node info if permissions available
      const existingSource = cleanedNodes[sourceNodeId] || prev[sourceNodeId];
      if (existingSource) {
        cleanedNodes[sourceNodeId] = {
          ...existingSource,
          isOpen: true, // Crucial: keep the flower open
          isConnected: relationsData.permissions?.is_connected ?? existingSource.isConnected,
          isReadOnly: relationsData.permissions?.is_readonly ?? existingSource.isReadOnly
        };
      }

      return cleanedNodes;
    });
  }, [getFilteredRelations, isTamil, profile.gender]);

  // Build nodes from API relations for next_flow endpoint - Special handling
  const buildNodesFromRelationsForNextFlow = useCallback((data: any, overrideGender?: string, sourceNodeId: string = 'root') => {
    console.log(`Building nodes for ${sourceNodeId} from NEXT_FLOW API relations + merging placeholders`);

    setNodes(prev => {
      const cleanedNodes: { [key: string]: UniverseNode } = {};
      Object.entries(prev).forEach(([id, node]) => {
        // Keep all nodes that are not children of the node we are rebuilding
        // Also keep the source node itself
        if (node.parentId !== sourceNodeId || id === sourceNodeId) {
          cleanedNodes[id] = node;
        }
      });

      const sourceNode = cleanedNodes[sourceNodeId];
      if (!sourceNode) return prev;

      const currentGender = overrideGender || sourceNode.gender || 'M';
      const baseRelations = getFilteredRelations(currentGender);

      // Handle both PersonRelationsResponse and NextFlowResponse structures
      const relationsData = data.existing_relations || data;
      const permissions = data.permissions || (data.existing_relations?.permissions);

      const apiOutgoing = relationsData.outgoing || [];
      const apiIncoming = relationsData.incoming || [];
      const allApi: any[] = Array.isArray(relationsData) ? relationsData : [...(relationsData.outgoing || []), ...(relationsData.incoming || [])];

      // Group API relations
      const groupedApi: { [key: string]: typeof allApi } = {};
      allApi.forEach(rel => {
        const isNextFlowItem = (rel as any).person_id !== undefined;
        let uiRel: string;

        if (isNextFlowItem) {
          uiRel = mapAPIToUIRelation((rel as any).direct_relation || (rel as any).relation_code);
        } else {
          const isOutgoing = String(rel.from_person) === String(sourceNode.personId);
          uiRel = mapAPIToUIRelation(rel.relation_code);

          if (isOutgoing) {
            let leafGender = (rel as any).brick_person_gender ||
              (rel as any).to_person_info?.gender ||
              (rel as any).to_person_gender ||
              (rel as any).gender ||
              (rel as any).person?.gender || 'M';

            if ((rel as any).brick_person_id === rel.to_person) {
              leafGender = (rel as any).brick_person_gender || leafGender;
            }
            if (rel.to_person === profile.id) {
              leafGender = profile.gender || leafGender;
            }

            uiRel = getInverseRelation(uiRel, leafGender);
          }
        }

        if (!groupedApi[uiRel]) groupedApi[uiRel] = [];
        groupedApi[uiRel].push(rel);
      });

      const nodesToCreate: any[] = [];
      const usedApiIds = new Set<string>();

      baseRelations.forEach(relType => {
        const matches = groupedApi[relType] || [];
        if (matches.length > 0) {
          matches.forEach(match => {
            const isNextFlowItem = (match as any).person_id !== undefined;
            let personId, personName;

            if (isNextFlowItem) {
              personId = (match as any).person_id;
              personName = (match as any).name;
            } else {
              const isOutgoing = String(match.from_person) === String(sourceNode.personId);
              personId = isOutgoing ? match.to_person : match.from_person;
              personName = isOutgoing ? match.to_person_name : match.from_person_name;
            }

            const relationLabel = getDisplayLabel(match.relation_label, true);

            const matchId = isNextFlowItem
              ? `${sourceNode.personId}-${(match as any).person_id}-${(match as any).direct_relation}`
              : `${match.from_person}-${match.to_person}-${match.relation_code}`;
            usedApiIds.add(matchId);

            // IMPORTANT: Check if this person is connected (has linked user)
            const isConnected = !!(match as any).person?.linked_user ||
              !!(match as any).to_person_info?.linked_user ||
              !!(match as any).from_person_info?.linked_user ||
              (match as any).is_connected ||
              (match as any).status === 'confirmed' ||
              (match as any).linked_user !== null ||
              (match as any).to_person_info?.id !== undefined ||
              (match as any).from_person_info?.id !== undefined;

            nodesToCreate.push({
              name: personName.toUpperCase(),
              relation: relType,
              relationLabel: relationLabel,
              arrowLabel: (match as any).arrow_label || (match as any).relation_label?.arrow_label,
              gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M',
              personId: personId,
              isUpdated: true,
              isConnected: isConnected, // Set based on actual connection status
              isReadOnly: permissions?.is_readonly,
              image: getFullImageUrl((match as any).image || (match as any).person?.image || (match as any).to_person_info?.image || (match as any).from_person_info?.image)
            });
          });
        } else {
          // Placeholder - NOT CONNECTED
          const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M';
          nodesToCreate.push({
            name: relType,
            relation: relType,
            relationLabel: getRelationLabel(relType, isTamil),
            gender: childGender,
            isUpdated: false,
            isConnected: false, // Placeholders are not connected
            isReadOnly: permissions?.is_readonly
          });
        }
      });

      // ADD LEFTOVER RELATIONS (NEXT FLOW)
      allApi.forEach(rel => {
        const isNextFlowItem = (rel as any).person_id !== undefined;
        let matchId: string;
        let uiRel: string;

        if (isNextFlowItem) {
          matchId = `${sourceNode.personId}-${(rel as any).person_id}-${(rel as any).direct_relation}`;
          uiRel = mapAPIToUIRelation((rel as any).direct_relation);
        } else {
          matchId = `${rel.from_person}-${rel.to_person}-${rel.relation_code}`;
          uiRel = mapAPIToUIRelation(rel.relation_code);
        }

        if (!usedApiIds.has(matchId)) {
          console.log("Adding leftover relation (next flow):", isNextFlowItem ? (rel as any).direct_relation : rel.relation_code);

          if (!isNextFlowItem) {
            const isOutgoing = String(rel.from_person) === String(sourceNode.personId);
            if (isOutgoing) {
              let leafGender = (rel as any).brick_person_gender ||
                (rel as any).to_person_info?.gender ||
                (rel as any).to_person_gender ||
                (rel as any).gender ||
                (rel as any).person?.gender || 'M';

              if ((rel as any).brick_person_id === rel.to_person) {
                leafGender = (rel as any).brick_person_gender || leafGender;
              }
              if (rel.to_person === profile.id) {
                leafGender = profile.gender || leafGender;
              }

              uiRel = getInverseRelation(uiRel, leafGender);
            }
          }

          const relationLabel = getDisplayLabel(rel.relation_label, true);

          // IMPORTANT: Check if this person is connected (has linked user)
          const isConnected = !!(rel as any).person?.linked_user ||
            !!(rel as any).to_person_info?.linked_user ||
            !!(rel as any).from_person_info?.linked_user ||
            (rel as any).is_connected ||
            (rel as any).status === 'confirmed' ||
            (rel as any).linked_user !== null ||
            (rel as any).to_person_info?.id !== undefined ||
            (rel as any).from_person_info?.id !== undefined;

          const personId = isNextFlowItem ? (rel as any).person_id : (String(rel.from_person) === String(sourceNode.personId) ? rel.to_person : rel.from_person);
          const personName = isNextFlowItem ? (rel as any).name : (String(rel.from_person) === String(sourceNode.personId) ? rel.to_person_name : rel.from_person_name);

          nodesToCreate.push({
            name: personName.toUpperCase(),
            relation: uiRel,
            relationLabel: relationLabel,
            arrowLabel: (rel as any).arrow_label || (rel as any).relation_label?.arrow_label,
            gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(uiRel) ? 'F' : 'M',
            personId: personId,
            isUpdated: true,
            isConnected: isConnected, // Set based on actual connection status
            isReadOnly: permissions?.is_readonly,
            image: getFullImageUrl((rel as any).image || (rel as any).person?.image || (rel as any).to_person_info?.image || (rel as any).from_person_info?.image)
          });
          usedApiIds.add(matchId);
        }
      });

      const count = nodesToCreate.length;
      const baseRadius = sourceNodeId === 'root' ? RADIUS_BASE : RADIUS_BASE * 0.85;
      const radius = baseRadius * (count > 11 ? Math.sqrt(count / 11) : 1);

      nodesToCreate.forEach((nodeData, i) => {
        const nodeId = `${sourceNodeId}-child-${i}`;
        const angle = (i * (360 / Math.max(count, 1))) * (Math.PI / 180);

        cleanedNodes[nodeId] = {
          id: nodeId,
          ...nodeData,
          level: sourceNode.level + 1,
          parentId: sourceNodeId,
          position: {
            x: sourceNode.position.x + Math.cos(angle) * radius,
            y: sourceNode.position.y + Math.sin(angle) * radius
          },
          isOpen: false
        };
      });

      // Update source node info if permissions available
      const currentSource = prev[sourceNodeId];
      if (currentSource) {
        cleanedNodes[sourceNodeId] = {
          ...currentSource,
          isOpen: true,
          isConnected: permissions?.is_connected ?? currentSource.isConnected,
          isReadOnly: permissions?.is_readonly ?? currentSource.isReadOnly
        };
      }

      return cleanedNodes;
    });
  }, [getFilteredRelations, isTamil, profile.gender]);

  const fetchExistingRelationsForNode = useCallback(async (personId: number, nodeId: string, nodeGender: string, isNextFlow: boolean = false) => {
    try {
      console.log(`Fetching relations for person ${personId} (node: ${nodeId}) isNextFlow: ${isNextFlow}`);
      const relationsData = await genealogyService.getPersonRelations(personId);

      setNodes(prev => {
        const nextNodes: { [key: string]: UniverseNode } = {};
        Object.entries(prev).forEach(([id, node]) => {
          if (node.parentId !== nodeId) {
            nextNodes[id] = node;
          }
        });

        const node = prev[nodeId];
        if (!node) return prev;

        // Mark this node as open
        nextNodes[nodeId] = { ...node, isOpen: true };

        const baseRelations = getFilteredRelations(nodeGender);
        const apiOutgoing = relationsData.outgoing || [];
        const apiIncoming = relationsData.incoming || [];
        const allApi = [...apiOutgoing, ...apiIncoming];

        // Group API relations
        const groupedApi: { [key: string]: typeof allApi } = {};
        allApi.forEach(rel => {
          const isOutgoing = String(rel.from_person) === String(personId);
          let uiRel = mapAPIToUIRelation(rel.relation_code);

          if (isOutgoing) {
            let leafGender = (rel as any).to_person_info?.gender ||
              (rel as any).to_person_gender ||
              (rel as any).gender || 'M';

            if ((rel as any).brick_person_id === rel.to_person) {
              leafGender = (rel as any).brick_person_gender || leafGender;
            }
            if (rel.to_person === profile.id) {
              leafGender = profile.gender || leafGender;
            }

            uiRel = getInverseRelation(uiRel, leafGender);
          }

          if (!groupedApi[uiRel]) groupedApi[uiRel] = [];
          groupedApi[uiRel].push(rel);
        });

        const nodesToCreate: any[] = [];
        const usedApiIds = new Set<string>();

        baseRelations.forEach(relType => {
          const matches = groupedApi[relType] || [];
          if (matches.length > 0) {
            matches.forEach(match => {
              const isOutgoing = String(match.from_person) === String(personId);
              const relatedPersonId = isOutgoing ? match.to_person : match.from_person;
              const relatedPersonName = isOutgoing ? match.to_person_name : match.from_person_name;
              const relationLabel = getDisplayLabel(match.relation_label, isNextFlow);

              const matchId = `${match.from_person}-${match.to_person}-${match.relation_code}`;
              usedApiIds.add(matchId);

              // IMPORTANT: Check if this person is connected (has linked user)
              const isConnected = !!(match as any).person?.linked_user ||
                !!(match as any).to_person_info?.linked_user ||
                !!(match as any).from_person_info?.linked_user ||
                (match as any).is_connected ||
                (match as any).status === 'confirmed' ||
                (match as any).linked_user !== null ||
                (match as any).to_person_info?.id !== undefined ||
                (match as any).from_person_info?.id !== undefined;

              nodesToCreate.push({
                name: relatedPersonName.toUpperCase(),
                relation: relType,
                relationLabel: relationLabel,
                arrowLabel: (match as any).arrow_label || (match as any).relation_label?.arrow_label,
                gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M',
                personId: relatedPersonId,
                isUpdated: true,
                isConnected: isConnected, // Set based on actual connection status
                image: getFullImageUrl((match as any).image || (match as any).person?.image || (match as any).to_person_info?.image || (match as any).from_person_info?.image)
              });
            });
          } else {
            // Placeholder - NOT CONNECTED
            const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M';
            nodesToCreate.push({
              name: nodeId === 'root' ? relType : `${relType} of ${node.name}`,
              relation: relType,
              relationLabel: getRelationLabel(relType, isTamil),
              gender: childGender,
              personId: Math.floor(Math.random() * 1000) + 5000,
              isUpdated: false,
              isConnected: false // Placeholders are not connected
            });
          }
        });

        // ADD LEFTOVER RELATIONS (FETCH FOR NODE)
        allApi.forEach(rel => {
          const matchId = `${rel.from_person}-${rel.to_person}-${rel.relation_code}`;
          if (!usedApiIds.has(matchId)) {
            const isOutgoing = String(rel.from_person) === String(personId);
            const rPersonId = isOutgoing ? rel.to_person : rel.from_person;
            const rPersonName = isOutgoing ? rel.to_person_name : rel.from_person_name;
            let uiRel = mapAPIToUIRelation(rel.relation_code);

            if (isOutgoing) {
              let leafGender = (rel as any).to_person_info?.gender ||
                (rel as any).to_person_gender ||
                (rel as any).gender || 'M';

              if ((rel as any).brick_person_id === rel.to_person) {
                leafGender = (rel as any).brick_person_gender || leafGender;
              }
              if (rel.to_person === profile.id) {
                leafGender = profile.gender || leafGender;
              }

              uiRel = getInverseRelation(uiRel, leafGender);
            }

            const relationLabel = getDisplayLabel(rel.relation_label, isNextFlow);

            // IMPORTANT: Check if this person is connected (has linked user)
            const isConnected = !!(rel as any).person?.linked_user ||
              !!(rel as any).to_person_info?.linked_user ||
              !!(rel as any).from_person_info?.linked_user ||
              (rel as any).is_connected ||
              (rel as any).status === 'confirmed' ||
              (rel as any).linked_user !== null ||
              (rel as any).to_person_info?.id !== undefined ||
              (rel as any).from_person_info?.id !== undefined;

            nodesToCreate.push({
              name: rPersonName.toUpperCase(),
              relation: uiRel,
              relationLabel: relationLabel,
              arrowLabel: (rel as any).arrow_label || (rel as any).relation_label?.arrow_label,
              gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(uiRel) ? 'F' : 'M',
              personId: rPersonId,
              isUpdated: true,
              isConnected: isConnected, // Set based on actual connection status
              image: getFullImageUrl((rel as any).image || (rel as any).person?.image || (rel as any).to_person_info?.image || (rel as any).from_person_info?.image)
            });
            usedApiIds.add(matchId);
          }
        });

        const count = nodesToCreate.length;
        const radius = RADIUS_BASE * (count > 11 ? Math.sqrt(count / 11) : 1);

        nodesToCreate.forEach((nodeData, i) => {
          const childId = `${nodeId}-child-${i}`;
          const angle = (i * (360 / Math.max(count, 1))) * (Math.PI / 180);

          nextNodes[childId] = {
            id: childId,
            ...nodeData,
            level: node.level + 1,
            parentId: nodeId,
            position: {
              x: node.position.x + Math.cos(angle) * radius,
              y: node.position.y + Math.sin(angle) * radius
            },
            isOpen: false
          };
        });

        return nextNodes;
      });

    } catch (error) {
      console.error(`Error fetching relations for person ${personId}:`, error);
      createDefaultRelationsForNode(nodeId, nodeGender);
    }
  }, [getFilteredRelations, createDefaultRelationsForNode, isTamil, profile.gender]);

  // Function to refresh family tree data
  const refreshFamilyTree = useCallback(async () => {
    if (!currentPerson?.id) return;

    try {
      console.log("Refreshing family tree data...");
      const relationsData = await genealogyService.getPersonRelations(currentPerson.id);
      buildNodesFromRelations(relationsData, currentPerson.gender);

      // Also refresh generation info
      fetchGenerationInfo(currentPerson.id);

      // Check for accepted invitations
      await checkForAcceptedInvitations();
    } catch (error) {
      console.error("Error refreshing family tree:", error);
    }
  }, [currentPerson?.id, currentPerson?.gender, buildNodesFromRelations, fetchGenerationInfo]);

  // ✅ NEW UPDATED: Function to check for accepted invitations with father linking fix
  const checkForAcceptedInvitations = useCallback(async () => {
    if (!currentPerson?.id) return;

    try {
      console.log("Checking for accepted invitations...");

      // Check each active invitation
      for (const invitation of activeInvitations) {
        try {
          // Check if person exists and is active
          const personDetails = await genealogyService.getPersonDetails(invitation.personId);

          if (personDetails && personDetails.is_alive) {
            console.log(`Person ${personDetails.full_name} has accepted invitation as ${invitation.relation}`);

            // ✅ FIX: Check if this was a placeholder invitation (e.g., "raman son")
            const invitationRelation = invitation.relation.toLowerCase();

            if (invitationRelation.includes('son') || invitationRelation.includes('daughter')) {
              console.log("Detected child relation invitation. Verifying father linkage...");

              // Try to fetch person's relationships to verify father
              try {
                const personRelations = await genealogyService.getPersonRelations(invitation.personId);

                // Check if person has father relationship
                const hasFather = personRelations.outgoing?.some(rel =>
                  rel.relation_code === 'FATHER'
                ) || personRelations.incoming?.some(rel =>
                  rel.relation_code === 'FATHER'
                );

                if (!hasFather) {
                  console.warn(`${personDetails.full_name} may not be linked to correct father. Placeholder issue detected.`);

                  // Parse father name from invitation (if possible)
                  const relationWords = invitation.relation.split(' ');
                  if (relationWords.length >= 2) {
                    const possibleFatherName = relationWords[0]; // "raman"
                    console.log(`Possible father name from placeholder: ${possibleFatherName}`);

                    // Show warning to user
                    toast(`${personDetails.full_name} may need manual father linking. ` +
                      `Expected father: ${possibleFatherName}`, { icon: '⚠️' }
                    );
                  }
                }
              } catch (relationError) {
                console.error("Error verifying father linkage:", relationError);
              }
            }

            // Remove from active invitations
            setActiveInvitations(prev =>
              prev.filter(inv => inv.personId !== invitation.personId)
            );

            // Show success message with father info if available
            let message = `${personDetails.full_name} has accepted your invitation!`;

            // Add father info if we have it
            if (invitation.fatherName) {
              message += ` Should be linked to father: ${invitation.fatherName}`;
            } else if ((personDetails as any).father_name) {
              message += ` Linked to father: ${(personDetails as any).father_name}`;
            }

            toast.success(message);

            // Refresh the tree to show the person
            refreshFamilyTree();
          }
        } catch (error) {
          console.log(`Still waiting for ${invitation.personName} to accept...`);
        }
      }
    } catch (error) {
      console.error("Error checking for accepted invitations:", error);
    }
  }, [currentPerson?.id, activeInvitations, refreshFamilyTree]);

  // ✅ UPDATED: Start checking for acceptance with father info
  const startCheckingForAcceptance = useCallback((
    personId: number,
    personName: string,
    relation: string,
    phoneNumber: string,
    fatherName?: string
  ) => {
    console.log(`Starting to check for acceptance of invitation for ${personName} as ${relation}`);

    // Add to active invitations with father info
    setActiveInvitations(prev => [
      ...prev,
      {
        personId,
        personName,
        relation,
        timestamp: Date.now(),
        phoneNumber,
        fatherName
      }
    ]);

    // Custom message based on relation type
    let message = `Invitation sent to ${personName}.`;

    // If this is a child relation and we have father name
    if (fatherName && (relation.toLowerCase().includes('son') || relation.toLowerCase().includes('daughter'))) {
      message += ` They will be linked as ${relation.toLowerCase()} of ${fatherName}.`;
    } else if (fatherName) {
      message += ` Parent: ${fatherName}`;
    }

    message += ` We'll notify you when they accept.`;

    toast.success(message);
  }, []);

  // Fetch generation info when currentPerson changes
  useEffect(() => {
    if (currentPerson?.id) {
      fetchGenerationInfo(currentPerson.id);
    }
  }, [currentPerson?.id, fetchGenerationInfo]);

  // Fetch all initial data when component mounts
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // 1. Fetch user profile first
        const profileData = await authService.getMyProfile();
        setProfile({
          ...profileData,
          image: getFullImageUrl(profileData.image as string)
        });
        console.log("1. Profile data fetched:", profileData);

        // 2. Fetch genealogy person 'me' details next
        let personMe: any = null;
        try {
          personMe = await genealogyService.getPersonMe();
          if (personMe) {
            setCurrentPerson(personMe);
            console.log("2. Person Me data fetched:", personMe);
          }
        } catch (e) {
          console.error("Error fetching genealogy 'me' person:", e);
        }

        const personIdToUse = personMe?.id || profileData.id;
        const personName = String(personMe?.full_name || profileData.firstname || 'YOU');
        const personGender = profileData.gender || personMe?.gender || 'M';
        const isFromAPI = !!personMe;

        // Update root node with available data
        setNodes(prev => ({
          ...prev,
          'root': {
            ...prev['root'],
            name: personName.toUpperCase(),
            gender: personGender,
            personId: personIdToUse,
            isUpdated: isFromAPI,
            image: getFullImageUrl((profileData as any).image || (personMe as any)?.image)
          }
        }));

        //  Update Navigation History with actual profile name
        setNavigationHistory(prev => {
          if (prev.length > 0 && prev[0].id === 'root') {
            const newHistory = [...prev];
            newHistory[0] = {
              ...newHistory[0],
              name: personName.toUpperCase()
            };
            return newHistory;
          }
          return prev;
        });

        if (personIdToUse) {
          // 3. Fetch initial relations for root
          const relationsData = await genealogyService.getPersonRelations(personIdToUse);
          buildNodesFromRelations(relationsData, personGender);
        }

        // After setting nodes, ensure root is centered and zoomed out
        setTimeout(() => {
          // Center the view on root node with zoom out
          if (nodes['root']) {
            setTransform({
              x: -nodes['root'].position.x * 0.3,
              y: -nodes['root'].position.y * 0.3,
              scale: 0.3
            });
          }

          // Auto-expand root node after data is loaded
          expandNode('root', personGender);
          hasAutoExpanded.current = true;
        }, 800);

      } catch (error) {
        console.error("Error fetching initial data:", error);
        toast.error(t('error'));
      }
    };

    fetchAllData();

    // Set up periodic refresh every 30 seconds
    refreshIntervalRef.current = setInterval(refreshFamilyTree, 30000);

    // Initial check after 10 seconds
    const initialCheck = setTimeout(checkForAcceptedInvitations, 10000);

    // Prevent default browser zoom on touchpad pinch
    const container = containerRef.current;
    if (container) {
      const preventZoom = (e: WheelEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      };
      container.addEventListener('wheel', preventZoom, { passive: false });
      return () => {
        container.removeEventListener('wheel', preventZoom);
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
        clearTimeout(initialCheck);
      };
    }
  }, []);

  // Handle auto-scroll of side panel when navigation history changes
  useEffect(() => {
    if (sidePanelScrollRef.current) {
      sidePanelScrollRef.current.scrollTo({
        top: sidePanelScrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [navigationHistory]);

  const expandNode = useCallback((nodeId: string, overrideGender?: string, isNextFlow: boolean = false) => {
    setNodes(prev => {
      const node = prev[nodeId];
      if (!node || node.isOpen) return prev;

      setActiveParentId(nodeId);
      const nextNodes = { ...prev };
      nextNodes[nodeId] = { ...node, isOpen: true };

      if (node.isUpdated && node.personId && node.personId > 0) {
        fetchExistingRelationsForNode(node.personId, nodeId, overrideGender || node.gender || 'M', isNextFlow);
      } else {
        const nodeGender = overrideGender || (nodeId === 'root' ? (profile.gender || currentPerson?.gender || 'M') : (node.gender || 'M'));
        createDefaultRelationsForNode(nodeId, nodeGender);
      }

      return nextNodes;
    });
  }, [currentPerson?.gender, profile.gender, fetchExistingRelationsForNode, createDefaultRelationsForNode]);

  const expandAshramam = useCallback((nodeId: string) => {
    setNodes(prev => {
      const node = prev[nodeId];
      if (!node || node.relation !== 'Ashramam') return prev;

      setActiveParentId(nodeId);
      const nextNodes = { ...prev };
      nextNodes[nodeId] = { ...node, isOpen: true };

      const radius = RADIUS_BASE;

      // Tamil relationship names for Ashramam members (from your image)
      const tamilRelations = [
        'தம்பி', 'அண்ணன்', 'அண்ணி', 'அக்கா', 'அம்மா', 'அப்பா',
        'மகன்', 'மகள்', 'மாமா', 'மாமி', 'பெரியப்பா', 'சித்தப்பா',
        'அத்தை', 'சித்தி', 'மைத்துனன்', 'மைத்துனி', 'மருமகன்',
        'மருமகள்', 'பேரன்', 'பெர்த்தி', 'தாத்தா', 'பாட்டி', 'தம்பி'
      ];

      // English relationship names (for fallback)
      const englishRelations = [
        'Younger Brother', 'Elder Brother', 'Sister-in-law', 'Elder Sister', 'Mother', 'Father',
        'Son', 'Daughter', 'Maternal Uncle', 'Aunt', 'Elder Uncle', 'Younger Uncle',
        'Paternal Aunt', 'Aunt', 'Brother-in-law', 'Sister-in-law', 'Son-in-law',
        'Daughter-in-law', 'Grandson', 'Granddaughter', 'Grandfather', 'Grandmother', 'Younger Brother'
      ];

      for (let i = 0; i < 23; i++) {
        const angle = (i * (360 / 23)) * (Math.PI / 180);
        const childId = `${nodeId}-leaf-${i}`;

        // Choose name based on language
        const relationName = isTamil ? tamilRelations[i] : englishRelations[i];

        // Determine gender based on relation
        let gender = 'M'; // default
        const tamilRelation = tamilRelations[i];
        if (tamilRelation.includes('அம்மா') || tamilRelation.includes('அண்ணி') ||
          tamilRelation.includes('அக்கா') || tamilRelation.includes('மகள்') ||
          tamilRelation.includes('மாமி') || tamilRelation.includes('அத்தை') ||
          tamilRelation.includes('சித்தி') || tamilRelation.includes('மைத்துனி') ||
          tamilRelation.includes('மருமகள்') || tamilRelation.includes('பெர்த்தி') ||
          tamilRelation.includes('பாட்டி')) {
          gender = 'F';
        }

        if (!nextNodes[childId]) {
          nextNodes[childId] = {
            id: childId,
            name: relationName,
            relation: 'Ashramam Member',
            relationLabel: relationName, // This will be displayed on the hexagon
            arrowLabel: relationName, // This will be displayed on the arrow
            level: node.level + 1,
            parentId: nodeId,
            position: {
              x: node.position.x + Math.cos(angle) * radius,
              y: node.position.y + Math.sin(angle) * radius
            },
            isOpen: false,
            gender: gender,
            personId: Math.floor(Math.random() * 1000) + 100,
            isUpdated: false,
            isConnected: false // Ashramam members are not connected by default
          };
        }
      }
      return nextNodes;
    });
  }, [isTamil]);

  // Scroll handling for web
  const handleWheel = useCallback((e: React.WheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.ctrlKey) {
      // Pinch to zoom or Ctrl+Wheel
      const delta = -e.deltaY;
      const factor = Math.exp(delta * 0.005);
      const newScale = Math.max(0.02, Math.min(4, transform.scale * factor));

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - transform.x) / transform.scale;
      const worldY = (mouseY - transform.y) / transform.scale;

      setTransform({
        x: mouseX - worldX * newScale,
        y: mouseY - worldY * newScale,
        scale: newScale
      });
    } else {
      // Normal scroll to pan
      setTransform(prev => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [transform]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      }));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDist.current = dist;

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        touchStartCenter.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
        };
      }
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX - transform.x, y: e.touches[0].clientY - transform.y };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length === 2 && touchStartDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist / touchStartDist.current;
      const newScale = Math.max(0.02, Math.min(4, transform.scale * delta));

      const { x: centerX, y: centerY } = touchStartCenter.current;
      const worldX = (centerX - transform.x) / transform.scale;
      const worldY = (centerY - transform.y) / transform.scale;

      setTransform({
        x: centerX - worldX * newScale,
        y: centerY - worldY * newScale,
        scale: newScale
      });
      touchStartDist.current = dist;
    } else if (e.touches.length === 1 && isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.touches[0].clientX - dragStart.current.x,
        y: e.touches[0].clientY - dragStart.current.y
      }));
    }
  };

  const handleTouchEnd = () => {
    touchStartDist.current = null;
    setIsDragging(false);
  };

  // Update handleNodeClick to add to navigation history AND ZOOM IN
  const handleNodeClick = (node: UniverseNode) => {
    // Clear hover info when clicking
    handleNodeHoverLeave();
    setInvitationError(null);

    const isRoot = node.id === 'root';
    const isHighlighted = isRoot ||
      node.id === activeParentId ||
      node.parentId === activeParentId ||
      (activeParentId && nodes[activeParentId]?.parentId === node.id);

    if (!isHighlighted) {
      console.log("Ignoring click on disabled node:", node.id);
      return;
    }

    // Get path and calculate relation for history side panel
    const getRelationAndAddHistory = async () => {
      const path = getPathToNode(node);
      const calcRelResult = await calculateRelationFromPath(path);
      // Add to navigation history
      addToNavigationHistory(node, calcRelResult?.label);
    };

    getRelationAndAddHistory();

    // ZOOM IN: Scale to 0.8 when clicking any node
    const targetScale = 0.8;
    setTransform({
      x: -node.position.x * targetScale,
      y: -node.position.y * targetScale,
      scale: targetScale
    });

    if (node.isReadOnly) {
      return;
    }

    // IMPORTANT: Check if node is connected and not root
    if (node.isConnected && node.id !== 'root') {
      setSelectedNode(node);
      setShowModal(true);
      return;
    }

    if (node.id === 'root') {
      expandNode('root');
    } else if (node.relation === 'Ashramam') {
      expandAshramam(node.id);
    } else {
      setSelectedNode(node);
      setShowModal(true);
    }
  };

  const handleNameEditClick = () => {
    if (selectedNode) {
      if (selectedNode.isUpdated) {
        setEditingName(selectedNode.name); // Prefill for existing names
      } else {
        setEditingName(''); // Keep empty for new placeholders
      }
      setShowNameEditModal(true);
    }
  };

  const handleSaveName = async () => {
    if (!selectedNode || !editingName.trim()) return;

    setIsSavingName(true);

    try {
      console.log("1. Starting save name process...");
      console.log("2. Selected Node:", selectedNode);
      console.log("3. Editing Name:", editingName);

      const relationToMe = mapRelationToAPI(selectedNode.relation);
      console.log("4. Mapped Relation:", selectedNode.relation, "→", relationToMe);

      // Check if we are editing a relative of someone else (Next Flower scenario)
      if (selectedNode.parentId && selectedNode.parentId !== 'root') {
        const parentNode = nodes[selectedNode.parentId];

        if (parentNode && parentNode.personId) {
          console.log(`Editing relative for person: ${parentNode.personId} (${parentNode.name})`);

          const payload: AddRelativeActionPayload = {
            action: `add_${relationToMe.toLowerCase()}`,
            full_name: editingName.trim()
          };

          console.log("Calling addRelativeAction with payload:", payload);
          const response = await genealogyService.addRelativeAction(parentNode.personId, payload);

          if (response.success) {
            toast.success(response.message);

            // Handle different response structures
            const newPersonData = (response as any).new_person || (response as any).person; // Fallback

            if (newPersonData) {
              const savedPersonId = newPersonData.id;
              const savedPersonName = newPersonData.name || newPersonData.full_name;

              setNodes(prev => ({
                ...prev,
                [selectedNode.id]: {
                  ...prev[selectedNode.id],
                  name: savedPersonName.toUpperCase(),
                  personId: savedPersonId,
                  isUpdated: true
                }
              }));

              setSelectedNode(prev => prev ? {
                ...prev,
                personId: savedPersonId,
                name: savedPersonName.toUpperCase(),
                isUpdated: true
              } : null);
            }

            // ✅ Refresh the tree by fetching next flow again
            try {
              // Wait 300ms for DB propagation
              await new Promise(resolve => setTimeout(resolve, 300));
              console.log("Refreshing next flow data for parent:", parentNode.personId);
              const flowResponse = await genealogyService.getNextFlow(parentNode.personId);
              if (flowResponse) {
                // Use the gender from parentNode for consistency
                buildNodesFromRelationsForNextFlow(flowResponse, parentNode.gender || 'M', selectedNode.parentId);
              }
            } catch (refreshError) {
              console.error("Error refreshing next flow:", refreshError);
            }

            setShowNameEditModal(false);
            setShowModal(false);
            return;
          }
        }
      }

      // Existing logic for root node or simple update scenarios
      const payload: AddRelativePayload = {
        full_name: editingName.trim(),
        relation_to_me: relationToMe,
        base_person: "self"
      };

      console.log("5. API Payload (Standard):", payload);

      // If we are just updating an existing person's name (and not creating a new relative for someone else)
      if (selectedNode.personId && selectedNode.isUpdated) {
        console.log("Updating existing person name...");
        const updateResponse = await genealogyService.updateRelativeName(
          selectedNode.personId,
          editingName.trim()
        );

        if (updateResponse.success) {
          toast.success(`Name updated to ${updateResponse.new_name}`);

          setNodes(prev => ({
            ...prev,
            [selectedNode.id]: {
              ...prev[selectedNode.id],
              name: updateResponse.new_name.toUpperCase(),
              isUpdated: true
            }
          }));

          setSelectedNode(prev => prev ? {
            ...prev,
            name: updateResponse.new_name.toUpperCase()
          } : null);

          setShowNameEditModal(false);
          setShowModal(false);
          return;
        }
      }

      console.log("Creating new relative for self...");
      const response = await genealogyService.addRelative(payload);

      console.log("7. API Response:", response);

      if (response.success) {
        console.log("8. API Success!");
        toast.success(response.message);

        // Store the API response for later use
        const savedPersonId = response.person.id;
        const savedPersonName = response.person.full_name;

        setNodes(prev => ({
          ...prev,
          [selectedNode.id]: {
            ...prev[selectedNode.id],
            name: savedPersonName.toUpperCase(),
            personId: savedPersonId,
            isUpdated: true
          }
        }));

        // Store the saved person info in selectedNode for invitation
        setSelectedNode(prev => prev ? {
          ...prev,
          personId: savedPersonId,
          name: savedPersonName.toUpperCase(),
          isUpdated: true
        } : null);

        setShowNameEditModal(false);
        setShowModal(false);
      } else {
        console.log("9. API returned success: false");
        toast.error('Failed to update name');
        setNodes(prev => ({
          ...prev,
          [selectedNode.id]: {
            ...prev[selectedNode.id],
            name: selectedNode.name,
            isUpdated: false
          }
        }));
      }
    } catch (error: any) {
      console.error('Error updating name:', error);
      console.log("10. Error details:", {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });

      toast.error(error.response?.data?.message || 'Failed to update name');

      setNodes(prev => ({
        ...prev,
        [selectedNode.id]: {
          ...prev[selectedNode.id],
          name: selectedNode.name,
          isUpdated: false
        }
      }));
    } finally {
      console.log("13. Process completed");
      setIsSavingName(false);
    }
  };

  // UPDATED: Handle send invitation with father name detection
  const handleSendInvitation = async () => {
    if (!selectedNode) return;

    if (!phoneNumber.trim()) {
      toast.error('Please enter a mobile number');
      return;
    }

    const phoneRegex = /^[0-9]{10}$/;
    const cleanedPhone = phoneNumber.replace(/\D/g, '');

    if (cleanedPhone.length !== 10 || !phoneRegex.test(cleanedPhone)) {
      toast.error('Please enter a valid 10 digit mobile number');
      return;
    }

    // Validate Indian mobile number prefix
    const validPrefixes = ['6', '7', '8', '9'];
    if (!validPrefixes.includes(cleanedPhone.charAt(0))) {
      toast.error('Please enter a valid Indian mobile number starting with 6, 7, 8, or 9');
      return;
    }

    setIsSendingInvitation(true);

    try {
      let personId = selectedNode.personId;

      // Debug log to check personId
      console.log("Selected Node personId for invitation:", personId);
      console.log("Selected Node:", selectedNode);

      if (!personId || personId <= 0) {
        // Try to extract from node ID as fallback
        const idParts = selectedNode.id.split('-');
        const lastPart = idParts[idParts.length - 1];
        const extractedId = parseInt(lastPart);

        if (!isNaN(extractedId) && extractedId > 0) {
          personId = extractedId;
          console.log("Extracted personId from node ID:", personId);
        } else {
          toast.error('Cannot find valid person information. Please save the name first.');
          setIsSendingInvitation(false);
          return;
        }
      }

      // Double-check the personId is valid
      if (!personId || personId <= 0) {
        console.error("Invalid personId detected:", personId);
        toast.error('Invalid person information. The person may not be saved yet.');
        setIsSendingInvitation(false);
        return;
      }

      // NEW: Detect father name for child relations
      let fatherName = '';
      const isChildRelation = selectedNode.relation.toLowerCase().includes('son') ||
        selectedNode.relation.toLowerCase().includes('daughter');

      if (isChildRelation) {
        // Find the father node (parent of selectedNode)
        const fatherNode = selectedNode.parentId ? nodes[selectedNode.parentId] : null;

        if (fatherNode && fatherNode.id !== 'root') {
          fatherName = fatherNode.name.replace(/\s+/g, ' ').trim();
          console.log(`Detected father for invitation: ${fatherName}`);
        } else if (selectedNode.name.toLowerCase().includes('son of') ||
          selectedNode.name.toLowerCase().includes('daughter of')) {
          // Parse from node name like "SON OF RAMAN"
          const match = selectedNode.name.match(/(?:SON|DAUGHTER)\s+OF\s+(\w+)/i);
          if (match) {
            fatherName = match[1];
            console.log(`Parsed father name from node name: ${fatherName}`);
          }
        }
      }

      console.log(`Sending invitation for person ID: ${personId} to phone: ${cleanedPhone}`);

      // ✅ FIXED: Create the payload object as expected by the service
      const invitationPayload: SendInvitationPayload = {
        mobile_number: cleanedPhone,
        relation_to_me: mapRelationToAPI(selectedNode.relation), // Add the required relation_to_me
      };

      // Add optional fields if they exist
      if (fatherName) {
        invitationPayload.father_name = fatherName;
      }

      // You can also add a custom message if needed
      invitationPayload.message = `Please join our family tree as ${selectedNode.relation}`;

      // Call the service with the correct parameters
      const response = await genealogyService.sendInvitation(
        personId,
        invitationPayload  // ✅ Now passing an object, not separate parameters
      );

      console.log("Invitation response:", response);

      // Recognize "already connected" as a success/info state
      const isAlreadyConnected = response?.status === 'already_connected' ||
        response?.code === 'already_connected_confirmed' ||
        (response as any)?.existing_connection === true;

      if (response && (response.success !== false || isAlreadyConnected)) {
        let successMessage = response.message || 'Invitation sent successfully!';

        if (isAlreadyConnected) {
          setInvitationError(successMessage);
          toast(successMessage, { icon: 'ℹ️' });
          // Refresh tree to show the confirmed connection
          refreshFamilyTree();
          return;
        }

        if (fatherName) {
          successMessage += ` Will be linked to father: ${fatherName}`;
        }
        toast.success(successMessage);

        // ✅ Start checking for acceptance with father info
        startCheckingForAcceptance(personId, selectedNode.name, selectedNode.relation, cleanedPhone, fatherName);

        // ✅ Close modals
        setShowPhoneModal(false);
        setShowModal(false);

        // ✅ Clear phone number
        setPhoneNumber('');
      } else {
        toast.error(response?.message || 'Failed to send invitation');
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);

      // More detailed error logging
      console.error("Error details:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      if (error.response?.status === 404) {
        toast.error('Person not found. Please save the name first before sending invitation.');
      } else if (error.response?.status === 400) {
        const errorData = error.response.data;
        const isAlreadyConnected = errorData?.status === 'already_connected' ||
          errorData?.code === 'already_connected_confirmed' ||
          errorData?.existing_connection === true;

        if (isAlreadyConnected) {
          const errMsg = errorData?.message || 'Already connected';
          setInvitationError(errMsg);
          toast(errMsg, { icon: 'ℹ️' });
          refreshFamilyTree();
          return;
        } else {
          // Display mismatch or other 400 errors in the modal
          const errMsg = errorData?.error || errorData?.details?.message || errorData?.message || 'Invalid request. Please check the information.';
          setInvitationError(errMsg);
          toast.error(errMsg);
        }
      } else {
        const errMsg = error.response?.data?.error ||
          error.response?.data?.message ||
          error.response?.data?.details?.message ||
          'Failed to send invitation. Please try again.';
        setInvitationError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const handleAddPeopleClick = () => {
    if (selectedNode) {
      // Proactively expand and focus the node so placeholders appear
      if (!selectedNode.isOpen) {
        expandNode(selectedNode.id);
      }
      setActiveParentId(selectedNode.id);

      setAddingPeopleName('');
      setShowAddPeopleModal(true);
    }
  };

  const handleSaveAddedPeople = async () => {
    if (!selectedNode || !addingPeopleName.trim()) return;

    setIsSavingAddedPeople(true);

    try {
      // Check if we are adding a relative in a "Next Flower" scenario (parent is not root)
      if (selectedNode.parentId && selectedNode.parentId !== 'root') {
        const parentNode = nodes[selectedNode.parentId];

        if (parentNode && parentNode.personId) {
          console.log(`Adding relative to person: ${parentNode.personId} (${parentNode.name})`);

          const relationCode = mapRelationToAPI(selectedNode.relation);
          const payload: AddRelativeActionPayload = {
            action: `add_${relationCode.toLowerCase()}`,
            full_name: addingPeopleName.trim()
          };

          console.log("Calling addRelativeAction (Add People) with payload:", payload);
          const response = await genealogyService.addRelativeAction(parentNode.personId, payload);

          if (response.success) {
            toast.success(response.message);

            // Refresh the tree by fetching next flow again
            try {
              // Wait 300ms for DB propagation
              await new Promise(resolve => setTimeout(resolve, 300));
              console.log("Refreshing next flow data for parent:", parentNode.personId);
              const flowResponse = await genealogyService.getNextFlow(parentNode.personId);
              if (flowResponse) {
                buildNodesFromRelationsForNextFlow(flowResponse, parentNode.gender || 'M', selectedNode.parentId);
              }
            } catch (refreshError) {
              console.error("Error refreshing next flow:", refreshError);
            }

            setShowAddPeopleModal(false);
            setShowModal(false);
            return;
          }
        }
      }

      // Existing logic for root node
      const parentNode = selectedNode.parentId ? nodes[selectedNode.parentId] : null;
      // If parent is root, we are adding to the profile user. 
      // If parent is something else, we use that person's ID.
      const basePersonId = parentNode?.personId || (selectedNode.parentId === 'root' ? (currentPerson?.id || profile.id || 1) : 1);

      const payload: AddRelativePayload = {
        full_name: addingPeopleName.trim(),
        relation_to_me: mapRelationToAPI(selectedNode.relation),
        base_person: selectedNode.parentId === 'root' ? "self" : "other",
        person_id: selectedNode.parentId === 'root' ? undefined : basePersonId
      };

      console.log("Adding dynamic relative payload:", payload);

      const response = await genealogyService.addRelative(payload);

      if (response.success) {
        toast.success(response.message);
        setShowAddPeopleModal(false);
        setShowModal(false);

        // Wait a tiny bit for API consistency then refresh
        setTimeout(async () => {
          if (selectedNode.parentId) {
            const pId = selectedNode.parentId === 'root' ? (currentPerson?.id || profile.id || 1) : parentNode?.personId;
            console.log(`Refreshing parent node ID: ${pId} for parentNode ID: ${selectedNode.parentId}`);
            if (pId) {
              const relationsData = await genealogyService.getPersonRelations(pId);
              console.log("Newly fetched relations after add:", relationsData);
              buildNodesFromRelations(relationsData, parentNode?.gender || (selectedNode.parentId === 'root' ? (currentPerson?.gender || profile.gender) : 'M'), selectedNode.parentId);
            }
          }
        }, 500);
      } else {
        toast.error('Failed to add person');
      }
    } catch (error: any) {
      console.error('Error adding person:', error);
      toast.error(error.response?.data?.message || 'Failed to add person');
    } finally {
      setIsSavingAddedPeople(false);
    }
  };

  const activeNodes = useMemo(() => {
    return Object.values(nodes).filter(n => {
      if (n.id === 'root') return true;
      if (n.parentId && nodes[n.parentId]?.isOpen) return true;
      if (n.level === 1 && n.isUpdated && n.parentId === 'root') return true;
      return false;
    });
  }, [nodes]);

  const getNodeChildren = useCallback((nodeId: string) => {
    return Object.values(nodes).filter(n => n.parentId === nodeId);
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-64px)] md:h-[calc(100vh-128px)] bg-[#f8fafc] overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        touchAction: 'none',
        height: '100vh',
        maxHeight: '100vh'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => {
        setIsDragging(false);
        handleNodeHoverLeave();
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ============ HOVER TOOLTIP ============ */}
      <AnimatePresence>
        {hoverInfo && <HoverTooltip />}
      </AnimatePresence>

      {/* ============ TOP LEFT SEARCH AND NAVIGATION ============ */}
      <div
        className="absolute top-4 left-4 z-40 flex flex-col gap-3 max-w-[calc(100vw-300px)]"
        onMouseDown={e => e.stopPropagation()}
        onMouseMove={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <button
            onClick={goToRoot}
            className="bg-white hover:bg-gray-50 text-blue-600 p-2.5 rounded-full shadow-lg border border-blue-100 flex items-center justify-center transition-all duration-300 hover:scale-110 group shrink-0"
            title={isTamil ? 'தொடக்கத்திற்கு செல்' : 'Go to Root'}
          >
            <Home size={20} className="group-hover:rotate-12 transition-transform" />
          </button>

          {/* Back Button - For generation by generation navigation */}
          <button
            onClick={handleBack}
            disabled={navigationHistory.length <= 1}
            className={`
              p-2.5 rounded-full shadow-lg border flex items-center justify-center transition-all duration-300 hover:scale-110 group shrink-0
              ${navigationHistory.length <= 1
                ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                : 'bg-white text-blue-600 border-blue-100 hover:bg-gray-50'}
            `}
            title={isTamil ? 'முந்தைய தலைமுறைக்குச் செல்ல' : 'Go to Previous Generation'}
          >
            <ChevronLeft size={22} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>

          {/* Search Bar */}
          <div className="relative flex flex-col items-start">
            <div className="relative group z-50">
              <div className={`
                absolute inset-0 bg-blue-500/10 rounded-2xl blur-md group-hover:blur-lg transition-all
                ${isSearching ? 'opacity-100' : 'opacity-0'}
              `}></div>
              <div className="relative flex items-center bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <div className="pl-4 text-gray-400">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  value={searchMobile}
                  onChange={(e) => setSearchMobile(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      // If suggestions exist, pick the first one? Or call the old handleMobileSearch?
                      // Standard behavior is usually picking the first suggestion or just searching.
                      // Given we have handleMobileSearch, we can keep it as fallback or primarily rely on suggestions.
                      // But handleMobileSearch uses a different service!
                      // Let's stick to handleSuggestionClick if there are suggestions, otherwise handleMobileSearch.
                      if (searchSuggestions.length > 0) {
                        handleSuggestionClick(searchSuggestions[0]);
                      } else {
                        handleMobileSearch();
                      }
                    }
                  }}
                  placeholder={isTamil ? 'மொபைல் எண் தேடல்...' : 'Search Mobile No...'}
                  className="py-2.5 px-3 w-40 md:w-64 bg-transparent outline-none text-sm font-semibold text-gray-700 placeholder:text-gray-400 placeholder:font-normal"
                />
                <button
                  onClick={() => handleMobileSearch()}
                  disabled={isSearching || !searchMobile.trim()}
                  className={`
                    h-full px-5 py-2.5 text-sm font-bold transition-all
                    ${isSearching || !searchMobile.trim()
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-linear-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600'}
                  `}
                >
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    isTamil ? 'தேடு' : 'Search'
                  )}
                </button>
              </div>
            </div>

            {/* Suggestions Dropdown */}
            {searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-60 animate-fadeIn max-h-[60vh] overflow-y-auto">
                {searchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={suggestion.id === -1}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 flex items-center justify-between group transition-colors 
                      ${suggestion.id === -1 ? 'cursor-default opacity-60' : 'hover:bg-blue-50'}
                    `}
                  >
                    <div>
                      <div className="font-bold text-gray-800 text-sm">{suggestion.full_name}</div>
                      {suggestion.id !== -1 && (
                        <div className="text-xs text-gray-500 flex flex-wrap items-center gap-2 mt-1">
                          <span className="font-mono text-gray-400">{suggestion.mobile_number}</span>


                        </div>
                      )}
                    </div>
                    {suggestion.id !== -1 && <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Ribbon / Breadcrumbs */}
        {navigationHistory.length > 1 && (
          <div className="flex items-center bg-white/80 backdrop-blur-sm border border-blue-100 rounded-xl shadow-lg px-2 py-1.5 overflow-x-auto scrollbar-hide max-w-full animate-fadeIn border-l-4 border-l-blue-500">
            {navigationHistory.map((item, index) => (
              <React.Fragment key={`${item.id}-${index}`}>
                <button
                  onClick={() => navigateToHistoryItem(item, index)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all whitespace-nowrap
                    ${index === navigationHistory.length - 1
                      ? 'bg-blue-50 text-blue-700 font-bold scale-105 shadow-xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-blue-600'}
                  `}
                >
                  <div className={`
                    w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black
                    ${index === navigationHistory.length - 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'}
                  `}>
                    {index + 1}
                  </div>
                  <span className="text-xs uppercase tracking-tighter">
                    {index === 0 ? (isTamil ? 'முதல் தலைமுறை' : '1st Gen') :
                      index === navigationHistory.length - 1 ? (isTamil ? 'தற்போது' : 'Current') :
                        (isTamil ? `${index + 1}-ம் தலைமுறை` : `Gen ${index + 1}`)}
                  </span>
                </button>
                {index < navigationHistory.length - 1 && (
                  <div className="text-gray-300 mx-0.5">
                    <ArrowRight size={12} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Image Overlay */}
      <AnimatePresence>
        {activeButtonIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-20 pt-32"
            onClick={() => setActiveButtonIndex(null)}
          >
            <div className="relative w-full max-w-5xl h-full rounded-2xl overflow-hidden shadow-2xl bg-white group">

              {/* Special handling for Relative List (card 1) to show two images */}
              {activeButtonIndex === 0 ? (
                <div className="w-full h-full flex items-stretch">
                  {/* First relative image */}
                  <div className="w-1/2 relative overflow-hidden border-r border-gray-100">
                    <img
                      src={relationImg}
                      alt="Relative List Left"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-6">
                      <h3 className="text-xl font-bold text-white text-center">உறவினர் பட்டியல் 1</h3>
                    </div>
                  </div>

                  {/* Second relative image */}
                  <div className="w-1/2 relative overflow-hidden">
                    <img
                      src={relation1Img}
                      alt="Relative List Right"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 to-transparent p-6">
                      <h3 className="text-xl font-bold text-white text-center">உறவினர் பட்டியல் 2</h3>
                    </div>
                  </div>
                </div>
              ) : activeButtonIndex === 2 ? (
                <div className="w-full h-full flex">
                  {/* First cultural image */}
                  <div className="flex-1 relative overflow-hidden">
                    <img
                      src={kalacharamImg}
                      alt="Cultural Box 1"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent flex items-end p-6">
                      <h3 className="text-xl font-bold text-white">Cultural Heritage 1</h3>
                    </div>
                  </div>

                  {/* Second cultural image */}
                  <div className="flex-1 relative overflow-hidden border-l border-white/20">
                    <img
                      src={kalacharam1Img}
                      alt="Cultural Box 2"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent flex items-end p-6">
                      <h3 className="text-xl font-bold text-white">Cultural Heritage 2</h3>
                    </div>
                  </div>
                </div>
              ) : (
                // For other cards, show single image
                <img
                  src={topButtons[activeButtonIndex].image}
                  alt={topButtons[activeButtonIndex].label}
                  className="w-full h-full object-contain hover:scale-105 transition-transform duration-700"
                />
              )}

              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-transparent to-transparent flex items-end p-8">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{topButtons[activeButtonIndex].label}</h2>
                  <p className="text-white/80 text-lg">
                    {activeButtonIndex === 0 && "View and manage your relatives list"}
                    {activeButtonIndex === 1 && "Download genealogy data and reports"}
                    {activeButtonIndex === 2 && "Explore cultural heritage and traditions"}
                    {activeButtonIndex === 3 && "Discover relationships between two people"}
                    {activeButtonIndex === 4 && "Connect and chat with family members"}
                    {activeButtonIndex === 5 && "Customize your genealogy experience"}
                  </p>
                </div>
              </div>

              <button
                className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/40 rounded-full text-white transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveButtonIndex(null);
                }}
              >
                <X size={28} />
              </button>

              {/* Image indicator dots */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {activeButtonIndex === 2 ? (
                  // Two dots for cultural box
                  <>
                    <div className="w-3 h-3 rounded-full bg-white/80"></div>
                    <div className="w-3 h-3 rounded-full bg-white/80"></div>
                  </>
                ) : (
                  // Single dot for other cards
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side Panel */}
      {showSidePanel && (
        <div
          className={`absolute top-0 right-0 z-40 h-full flex flex-col bg-white border-l border-gray-200 shadow-lg transition-all duration-300 ${isPanelCollapsed ? 'w-12' : 'w-64'
            }`}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            {!isPanelCollapsed && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-blue-600 clip-path-hexagon flex items-center justify-center">
                    <Users size={14} className="text-white" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-gray-800">Journey</h2>
              </div>
            )}
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title={isPanelCollapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronRight size={16} className={`transition-transform ${isPanelCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Panel Content */}
          {!isPanelCollapsed && (
            <div
              ref={sidePanelScrollRef}
              className="flex-1 overflow-y-auto p-4"
            >
              <style>{`
                .clip-path-hexagon {
                  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                }
                .clip-path-hexagon-sm {
                  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                }
                .clip-path-arrow-down {
                  clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
                }
              `}</style>

              {/* Main container with central guide line */}
              <div className="relative">
                {/* Central vertical line - subtle */}
                <div className="absolute left-1/2 top-2 bottom-2 transform -translate-x-1/2 w-px bg-linear-to-b from-gray-200 via-gray-300 to-gray-200"></div>

                <div className="space-y-8 relative">
                  {navigationHistory.map((item, index) => {
                    const isLast = index === navigationHistory.length - 1;
                    const isFirst = index === 0;

                    return (
                      <div key={item.id} className="relative flex flex-col items-center">

                        {/* Hexagonal Card - Compact size for professional look */}
                        <div className="relative group cursor-pointer"
                          onClick={() => {
                            console.log(`Side panel clicked: ${item.name} at index ${index}`);
                            navigateToHistoryItem(item, index);
                          }}>
                          {/* Relation Label to the Left - New Requested Feature */}
                          {item.calculatedRelation && (
                            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-16 text-right animate-fadeIn">
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50/80 backdrop-blur-xs px-2 py-0.5 rounded border border-blue-100 shadow-xs uppercase tracking-tighter">
                                {item.calculatedRelation}
                              </span>
                            </div>
                          )}

                          {/* Hexagon shape - further decreased size to w-24 as requested */}
                          <div className={`w-24 h-28 clip-path-hexagon flex flex-col items-center justify-center p-2 transition-all duration-300 ${isLast
                            ? 'bg-linear-to-br from-green-500 to-green-600 border-2 border-green-400 shadow-lg scale-110'
                            : 'bg-linear-to-br from-gray-100 to-gray-200 border border-gray-300 shadow-xs hover:border-green-300 hover:shadow-sm'
                            }`}>
                            {/* User icon - conditionally rendered/styled */}
                            {item.isUpdated && ( // Only show icon if node is updated
                              <User
                                size={28} // Assuming a default size, adjust as needed
                                className={`${isLast ? 'text-white' : 'text-gray-400'}`}
                              />
                            )}

                            {/* Content */}
                            <div className="text-center space-y-0.5">
                              {/* Name */}
                              <div className={`text-[10px] font-black tracking-tight leading-none truncate w-16 ${isLast ? 'text-white' : 'text-gray-700'}`}>
                                {item.name}
                              </div>

                              {/* Relation */}
                              <div className={`text-[8px] font-bold leading-none ${isLast ? 'text-green-100' : 'text-green-600/80'}`}>
                                {item.relation}
                              </div>

                              {/* Level */}
                              <div className={`mt-1 text-[7px] font-black px-1.5 py-0.5 rounded-full inline-block ${isLast
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-200/50 text-gray-400'
                                }`}>
                                LV {item.level}
                              </div>
                            </div>
                          </div>

                          {/* "active" indicator */}
                          {isLast && (
                            <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 z-10">
                              <div className="px-1.5 py-0.5 bg-green-500 text-white text-[6px] font-black rounded-full shadow-sm">
                                ACTIVE
                              </div>
                            </div>
                          )}

                          {/* Root indicator */}
                          {isFirst && (
                            <div className="absolute -left-1 top-1/2 transform -translate-y-1/2">
                              <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                            </div>
                          )}
                        </div>

                        {/* Hexagonal Arrow with relationship label - Showing arrow labels as requested */}
                        {!isLast && (
                          <div className="relative mt-4 mb-4">
                            {/* Connection line */}
                            <div className="flex flex-col items-center">
                              <div className="w-0.5 h-4 bg-linear-to-b from-blue-400 to-blue-300"></div>

                              {/* Hexagonal arrow container */}
                              <div className="relative my-2">
                                {(() => {
                                  const fullLabel = navigationHistory[index + 1]?.arrowLabel || 'Next';
                                  // Split by arrow symbols
                                  const labelParts = fullLabel.split(/->|→/);
                                  const hasSplit = labelParts.length > 1;
                                  const topLabel = hasSplit ? labelParts[0].trim() : '';
                                  const bottomLabel = hasSplit ? labelParts[1].trim() : fullLabel;

                                  return (
                                    <>
                                      {/* Label ABOVE arrow (e.g., Magal) */}
                                      {hasSplit && (
                                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
                                          <span className="text-[9px] font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded-full shadow-xs border border-blue-100 uppercase backdrop-blur-sm">
                                            {topLabel}
                                          </span>
                                        </div>
                                      )}

                                      {/* Outer hexagon */}
                                      <div className="w-10 h-10 rounded-xl bg-linear-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform z-10 relative">
                                        {/* Inner triangle arrow */}
                                        <div className="w-2 h-2 clip-path-arrow-down bg-white"></div>
                                      </div>

                                      {/* Label BELOW arrow (e.g., Appa) */}
                                      <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
                                        <span className="text-[9px] font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded-full shadow-xs border border-blue-100 uppercase backdrop-blur-sm">
                                          {bottomLabel}
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="w-0.5 h-6 bg-linear-to-b from-blue-300 to-blue-400"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary section */}
              {navigationHistory.length > 1 && (
                <div className="mt-12 pt-6 border-t border-gray-200">
                  <div className="bg-linear-to-r from-gray-50 to-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="text-center space-y-3">
                      <div className="text-sm font-semibold text-gray-700">Journey Summary</div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-xl font-bold text-blue-600">{navigationHistory.length}</div>
                          <div className="text-xs text-gray-500 mt-1">Steps</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-xl font-bold text-green-600">
                            {navigationHistory[navigationHistory.length - 1].level}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Current Level</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 pt-2">
                      Click any hexagon to jump back
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collapsed Panel - Hexagonal style */}
      {isPanelCollapsed && (
        <div className="flex flex-col items-center justify-center flex-1 p-4">
          <div className="relative">
            {/* Hexagon for steps count */}
            <div className="w-12 h-14 clip-path-hexagon-sm bg-linear-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shadow-md">
              <span className="text-lg font-bold text-blue-700">{navigationHistory.length}</span>
            </div>

            {/* Small indicator */}
            <div className="absolute -top-1 -right-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
          </div>

          <div className="mt-6 text-center space-y-1">
            <div className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">
              Journey
            </div>
            <div className="text-[10px] text-gray-500">
              Path
            </div>
          </div>

          {/* Mini hexagons */}
          <div className="mt-6 flex flex-col items-center space-y-1">
            {[...Array(Math.min(3, navigationHistory.length))].map((_, i) => (
              <div key={i} className="w-3 h-4 clip-path-hexagon-sm bg-linear-to-br from-gray-300 to-gray-400"></div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Side Panel Button */}
      <button
        onClick={() => setShowSidePanel(!showSidePanel)}
        className={`
          absolute top-20 right-4 z-50
          p-2 rounded-full
          bg-white border border-gray-300
          shadow-lg hover:shadow-xl
          transition-all duration-300
          hover:bg-gray-50
          ${showSidePanel ? 'right-72' : 'right-4'}
        `}
        title={showSidePanel ? "Hide Navigation Panel" : "Show Navigation Panel"}
      >
        {showSidePanel ? (
          <ChevronRight size={18} className="text-gray-700" />
        ) : (
          <ChevronLeft size={18} className="text-gray-700" />
        )}
      </button>

      {/* Generation Info Box - Moved down to avoid clash with top bar */}
      {
        generationInfo && (
          <div className="absolute top-48 left-4 z-50 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-2xl p-4 shadow-xl min-w-70">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Hash size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">
                    Generation {generationInfo.generation.number}
                  </h3>
                  <p className="text-sm text-gray-600">{generationInfo.generation.label}</p>
                </div>
              </div>
              {isLoadingGenerationInfo && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Family Members</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-blue-600">
                    {generationInfo.member_counts.total_connected}
                  </span>
                  <span className="text-sm text-gray-500">people</span>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Active invitations indicator - moved down to make room for generation info */}
      {
        activeInvitations.length > 0 && (
          <div className="absolute top-24 left-4 z-50 bg-amber-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <Bell size={14} />
            <span>{activeInvitations.length} pending invitation(s)</span>
          </div>
        )
      }

      {/* Refresh button */}
      <button
        onClick={refreshFamilyTree}
        className="absolute top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg flex items-center justify-center"
        title="Refresh Family Tree"
      >
        <RefreshCw size={18} />
      </button>

      {
        (isLoadingRelations || isLoadingPerson) && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-full text-sm animate-pulse">
            {isLoadingPerson ? t('loading') : t('loading')}
          </div>
        )
      }

      <div
        className="absolute w-full h-full transform-origin-center z-10"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: (isDragging || touchStartDist.current !== null) ? 'none' : 'transform 0.8s cubic-bezier(0.165, 0.84, 0.44, 1)'
        }}
      >
        <div className="absolute top-1/2 left-1/2">
          <HoneycombBackground />

          <svg
            className="absolute overflow-visible pointer-events-none"
            style={{ left: 0, top: 0 }}
          >
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#f1b434" />
              </marker>
              <marker id="ashramam-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 Z" fill="#9b59b6" />
              </marker>
              <marker id="existing-arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 Z" fill="#10b981" />
              </marker>
            </defs>

            {Object.values(nodes).map(node => {
              if (!node.isOpen || node.relation !== 'Ashramam') return null;

              const children = getNodeChildren(node.id);
              const isDimmed = activeParentId !== node.id;

              return children.map((child, i) => {
                const dx = child.position.x - node.position.x;
                const dy = child.position.y - node.position.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);

                const r1 = getHexRadiusAtAngle(angle, 90, 105);
                const r2 = getHexRadiusAtAngle(angle + Math.PI, 90, 105);

                const x1 = node.position.x + Math.cos(angle) * r1;
                const y1 = node.position.y + Math.sin(angle) * r1;
                const x2 = child.position.x - Math.cos(angle) * r2;
                const y2 = child.position.y - Math.sin(angle) * r2;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                // Unit perpendicular vector (to the side of the line)
                const ux = -(y2 - y1) / distance;
                const uy = (x2 - x1) / distance;

                const curveOffset = 25;
                const cx = midX + ux * curveOffset;
                const cy = midY + uy * curveOffset;

                // Position label along the curve at 50% distance, to the SIDE
                const labelDistance = 0.5;
                const t = labelDistance;
                const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
                const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

                // Calculate tangent angle at this point on the curve
                const tx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
                const ty = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);
                const labelAngle = Math.atan2(ty, tx);

                // Position label to the SIDE of the line (perpendicular offset)
                const sideOffset = 20; // Distance from the line
                const labelX = bx + ux * sideOffset;
                const labelY = by + uy * sideOffset;

                return (
                  <g key={`ashramam-line-${node.id}-${child.id}`}>
                    <path
                      d={`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`}
                      fill="none"
                      stroke="#9b59b6"
                      strokeWidth="2"
                      strokeDasharray="5,3"
                      markerEnd="url(#ashramam-arrow)"
                      opacity={isDimmed ? 0.2 : 0.7}
                      style={{ transition: 'opacity 0.6s' }}
                    />
                    {child.relationLabel && (
                      <>
                        <text
                          x={labelX}
                          y={labelY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-[10px] font-bold pointer-events-none"
                          style={{
                            opacity: isDimmed ? 0.3 : 1,
                            fontSize: '10px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            fill: '#4b5563', // Gray-600
                            userSelect: 'none',
                            filter: 'drop-shadow(0px 0px 1px white) drop-shadow(0px 0px 2px white)',
                            paintOrder: 'stroke fill',
                            stroke: 'white',
                            strokeWidth: '1px',
                            strokeLinejoin: 'round',
                          }}
                          transform={`rotate(${labelAngle * (180 / Math.PI)}, ${labelX}, ${labelY})`}
                        >
                          {/* Format: [ME label] – [RELATION label] */}
                          {/* Use the parent node's gender (node.gender) */}
                          {child.arrowLabel ? child.arrowLabel : getArrowLabel(
                            node.gender || 'M',  // Parent (center) node's gender
                            child.relation,
                            child.relationLabel,
                            isTamil
                          )}
                        </text>
                      </>
                    )}
                  </g>
                );
              });
            })}


            {Object.values(nodes).map(node => {
              if (!node.isOpen || node.relation === 'Ashramam') return null;

              const parentGender = node.id === 'root' ? (currentPerson?.gender || profile.gender || 'M') : (node.gender || 'M');
              const relations = getFilteredRelations(parentGender);
              const isDimmed = activeParentId && activeParentId !== node.id;
              const children = getNodeChildren(node.id);

              return children.map((child) => {
                if (!child) return null;

                const dx = child.position.x - node.position.x;
                const dy = child.position.y - node.position.y;
                const angle = Math.atan2(dy, dx);
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Use standard size (90, 105) for root node connections too
                const r1 = getHexRadiusAtAngle(angle, 90, 105);
                const r2 = getHexRadiusAtAngle(angle + Math.PI, 90, 105);

                const strokeColor = child.isUpdated ? "#10b981" : "#f1b434";
                const markerId = child.isUpdated ? "existing-arrow" : "arrow";

                const x1 = node.position.x + Math.cos(angle) * r1;
                const y1 = node.position.y + Math.sin(angle) * r1;
                const x2 = child.position.x - Math.cos(angle) * r2;
                const y2 = child.position.y - Math.sin(angle) * r2;

                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                // Unit perpendicular vector (to the side of the line)
                const ux = -(y2 - y1) / distance;
                const uy = (x2 - x1) / distance;

                // Curve bulge
                const curveOffset = 30;
                const cx = midX + ux * curveOffset;
                const cy = midY + uy * curveOffset;

                // Position label along the curve at 50% distance, but to the SIDE (not on the line)
                const labelDistance = 0.5;
                const t = labelDistance;
                const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
                const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

                // Calculate tangent angle at this point on the curve
                const tx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
                const ty = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);
                const labelAngle = Math.atan2(ty, tx);

                // Position label to the SIDE of the line (perpendicular offset)
                const sideOffset = 25; // Distance from the line
                const labelX = bx + ux * sideOffset;
                const labelY = by + uy * sideOffset;

                return (
                  <g key={`line-${node.id}-${child.id}`}>
                    <path
                      d={`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={child.isUpdated ? "3" : "2.5"}
                      markerEnd={`url(#${markerId})`}
                      opacity={isDimmed ? 0.2 : 1}
                      style={{ transition: 'opacity 0.6s' }}
                    />
                    {child.relationLabel && (
                      <text
                        x={labelX}
                        y={labelY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-[11px] font-bold pointer-events-none"
                        style={{
                          opacity: isDimmed ? 0.3 : 1,
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          fill: '#374151', // Gray-700
                          userSelect: 'none',
                          // Add text shadow for better visibility
                          filter: 'drop-shadow(0px 0px 1px white) drop-shadow(0px 0px 2px white)',
                          paintOrder: 'stroke fill', // Stroke outside, fill inside for better readability
                          stroke: 'white', // White outline
                          strokeWidth: '1px',
                          strokeLinejoin: 'round',
                        }}
                        transform={`rotate(${labelAngle * (180 / Math.PI)}, ${labelX}, ${labelY})`}
                      >
                        {/* Format: [ME label] – [RELATION label] */}
                        {/* Use the parent node's gender (node.gender) */}
                        {child.arrowLabel ? child.arrowLabel : getArrowLabel(
                          node.gender || 'M',  // Parent (center) node's gender
                          child.relation,
                          child.relationLabel,
                          isTamil
                        )}
                      </text>
                    )}
                  </g>
                );
              });
            })}

            {/* Active Nodes Rendering */}
            {activeNodes.map(node => {
              const isRoot = node.id === 'root';
              const isAshramam = node.relation === 'Ashramam';
              const isAshramamLeaf = node.relation === 'Ashramam Member';
              const scaleFactor = Math.pow(0.95, node.level);

              const w = 90 * scaleFactor;
              const h = 105 * scaleFactor;

              const isHighlighted = !activeParentId ||
                node.id === activeParentId ||
                node.parentId === activeParentId;

              let fillColor = isRoot ? "#2ecc71" : "#9ca3af"; //  (medium gray)
              let strokeColor = isRoot ? "#27ae60" : "#6b7280"; //  (dark gray)

              if (node.isUpdated) {
                fillColor = "#10b981";
                strokeColor = "#059669";
              } else if (isAshramam) {
                fillColor = "#9b59b6";
                strokeColor = "#8e44ad";
              } else if (isAshramamLeaf) {
                fillColor = "#3498db";
                strokeColor = "#2980b9";
              }

              return (
                <g
                  key={`node-${node.id}`}
                  transform={`translate(${node.position.x}, ${node.position.y})`}
                  className="pointer-events-auto"
                  style={{
                    opacity: isHighlighted ? 1 : 0.3,
                    transition: 'opacity 0.6s, fill 0.3s, stroke 0.3s',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={(e) => handleNodeHoverEnter(node, e)}
                  onMouseLeave={handleNodeHoverLeave}
                  onTouchStart={(e) => handleNodeTouchStart(node, e)}
                  onTouchEnd={handleNodeTouchEnd}
                >
                  {isRoot && node.image ? (
                    <>
                      {/* Define clip path for hexagon */}
                      <defs>
                        <clipPath id={`hexagonClip-${node.id}`}>
                          <path
                            d={`M 0,${-h / 2} L ${w / 2},${-h / 4} L ${w / 2},${h / 4} L 0,${h / 2} L ${-w / 2},${h / 4} L ${-w / 2},${-h / 4} Z`}
                          />
                        </clipPath>
                      </defs>

                      {/* White background behind image for better contrast */}
                      <path
                        d={`M 0,${-h / 2} L ${w / 2},${-h / 4} L ${w / 2},${h / 4} L 0,${h / 2} L ${-w / 2},${h / 4} L ${-w / 2},${-h / 4} Z`}
                        fill="white"
                        stroke="#ffffff"
                        strokeWidth="3"
                      />

                      {/* Image with proper positioning - Fixed href type issue */}
                      <image
                        href={typeof node.image === 'string' ? node.image : ''}
                        x={-w / 2}
                        y={-h / 2}
                        width={w}
                        height={h}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath={`url(#hexagonClip-${node.id})`}
                      />

                      {/* Dark overlay for better text visibility */}
                      <path
                        d={`M 0,${-h / 2} L ${w / 2},${-h / 4} L ${w / 2},${h / 4} L 0,${h / 2} L ${-w / 2},${h / 4} L ${-w / 2},${-h / 4} Z`}
                        fill="rgba(0,0,0,0.3)"
                        stroke={strokeColor}
                        strokeWidth="3"
                      />

                      {/* Name text with better styling */}
                      <text
                        x="0"
                        y={h * 0.25}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-white font-bold uppercase pointer-events-none"
                        style={{
                          filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))',
                          fontWeight: '900',
                          letterSpacing: '0.8px',
                          fontSize: `${Math.max(8, 12 * scaleFactor)}px`,
                          fill: 'white',
                          stroke: 'black',
                          strokeWidth: '1px',
                          strokeLinejoin: 'round',
                          paintOrder: 'stroke fill'
                        }}
                      >
                        {node.name}
                      </text>

                      {/* Additional relation label if needed */}
                      <text
                        x="0"
                        y={h * 0.4}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="text-white font-medium pointer-events-none"
                        style={{
                          filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.8))',
                          fontWeight: '600',
                          letterSpacing: '0.5px',
                          fontSize: `${Math.max(6, 9 * scaleFactor)}px`,
                          fill: '#e5e7eb',
                          stroke: 'black',
                          strokeWidth: '0.5px',
                          paintOrder: 'stroke fill'
                        }}
                      >
                        {node.relation}
                      </text>
                    </>
                  ) : (
                    // Original hexagon for non-root nodes or when no image
                    <>
                      <path
                        d={`M 0,${-h / 2} L ${w / 2},${-h / 4} L ${w / 2},${h / 4} L 0,${h / 2} L ${-w / 2},${h / 4} L ${-w / 2},${-h / 4} Z`}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth="3"
                      />

                      <foreignObject x={-w / 2} y={-h / 2} width={w} height={h}>
                        <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 select-none overflow-hidden">
                          {node.image ? (
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden mb-1 border-2 border-white/50 shadow-inner">
                              <img
                                src={node.image}
                                alt={node.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            node.isUpdated ? (
                              <User
                                size={isRoot ? 26 : 18}
                                color={isAshramam || isAshramamLeaf ? "white" :
                                  node.isUpdated ? "white" :
                                    isRoot ? "white" : "black"}
                              />
                            ) : (
                              <UserPlus
                                size={14}
                                color="black"
                                className="opacity-40"
                              />
                            )
                          )}
                          <div className={`font-black uppercase leading-tight ${isRoot || isAshramam || isAshramamLeaf || node.isUpdated ?
                            "text-white text-[11px]" : "text-black text-[9px]"
                            }`}>
                            {/* For Ashramam Members, show the relation name directly */}
                            {isAshramamLeaf ? node.name : (node.isUpdated ? node.name : t(node.name))}
                          </div>
                        </div>
                      </foreignObject>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Modal with Add People button showing for ALL nodes (including connected) */}
      <AnimatePresence>
        {showModal && selectedNode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowModal(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>

              <h2 className="text-2xl font-bold text-white mb-1 pr-8">{selectedNode.name}</h2>
              <p className="text-slate-400 text-sm mb-6 uppercase tracking-wider font-semibold">{selectedNode.relation}</p>

              {/* Modal Actions - CONDITIONAL BASED ON CONNECTION STATUS */}
              <div className="space-y-3">
                {selectedNode.isConnected ? (
                  /* ✅ CONNECTED PERSON - Show only 2 buttons */
                  <>
                    {/* Next Flower button */}
                    <button
                      onClick={async () => {
                        if (selectedNode.isUpdated && selectedNode.personId) {
                          try {
                            const response = await genealogyService.getNextFlow(selectedNode.personId);

                            // Extract person and relations from the response
                            const nextPerson = (response as any).person;
                            const permissions = (response as any).permissions;

                            if (nextPerson) {
                              const personName = (nextPerson.full_name || nextPerson.name || selectedNode.name).toUpperCase();
                              const personGender = nextPerson.gender || 'F';

                              // Always call building function to ensure placeholders are created if no relations exist
                              buildNodesFromRelationsForNextFlow(response, personGender, selectedNode.id);

                              // 3. Fetch generation info for the new person
                              fetchGenerationInfo(nextPerson.id);

                              // 4. Move transform to center on the NEW focus node
                              setTransform({
                                x: -selectedNode.position.x * 0.8,
                                y: -selectedNode.position.y * 0.8,
                                scale: 0.8
                              });

                              // ✅ Calculate relation before updating history
                              const path = getPathToNode(selectedNode);
                              const calcRelResult = await calculateRelationFromPath(path);

                              // 5. Update active focus so other branches dim
                              setActiveParentId(selectedNode.id);

                              // 6. ✅ Update navigation history name and personId (if it was a placeholder)
                              setNavigationHistory(prev => {
                                const newHistory = [...prev];
                                const lastIndex = newHistory.length - 1;
                                if (lastIndex >= 0 && newHistory[lastIndex].id === selectedNode.id) {
                                  newHistory[lastIndex] = {
                                    ...newHistory[lastIndex],
                                    name: personName,
                                    personId: nextPerson.id,
                                    calculatedRelation: calcRelResult?.label
                                  };
                                }
                                return newHistory;
                              });

                              toast.success(`Viewing ${personName}'s tree`);
                            }
                          } catch (e) {
                            console.error("Error in next flow:", e);
                            toast.error("Failed to load connected person");
                          }
                        } else {
                          // Logic for placeholders or special cases if needed
                          if (selectedNode.relation === 'Ashramam') {
                            expandAshramam(selectedNode.id);
                          } else {
                            // Always center and focus even for placeholder expansion
                            setTransform({
                              x: -selectedNode.position.x * 0.8,
                              y: -selectedNode.position.y * 0.8,
                              scale: 0.8
                            });
                            setActiveParentId(selectedNode.id);
                            expandNode(selectedNode.id);
                          }
                        }
                        setShowModal(false);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors"
                    >
                      <span className="flex items-center"><Flower2 size={20} className="mr-3" /> {t('nextFlower')}</span>
                      <span>→</span>
                    </button>

                    {/* Add People button */}
                    <button
                      onClick={handleAddPeopleClick}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors shadow-lg"
                    >
                      <span className="flex items-center">
                        <UserPlus size={20} className="mr-3" /> {t('addPeople')}
                      </span>
                      <span>→</span>
                    </button>
                  </>
                ) : (
                  /* ❌ NON-CONNECTED PERSON (Placeholder) - Show all 4 buttons */
                  <>
                    {/* Edit Name button */}
                    <button
                      onClick={handleNameEditClick}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors"
                    >
                      <span className="flex items-center">
                        <Edit size={20} className="mr-3" />
                        {selectedNode.isUpdated ? t('editName') : t('enterName')}
                      </span>
                      <span>→</span>
                    </button>

                    {/* Connect button */}
                    <button onClick={() => {
                      setInvitationError(null);
                      setShowPhoneModal(true);
                    }} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors">
                      <span className="flex items-center"><Phone size={20} className="mr-3" /> {t('connect')}</span>
                      <span>→</span>
                    </button>

                    {/* Next Flower button */}
                    <button
                      onClick={async () => {
                        if (selectedNode.isUpdated && selectedNode.personId) {
                          try {
                            const response = await genealogyService.getNextFlow(selectedNode.personId);

                            // Extract person and relations from the response
                            const nextPerson = (response as any).person;
                            const permissions = (response as any).permissions;

                            if (nextPerson) {
                              const personName = (nextPerson.full_name || nextPerson.name || selectedNode.name).toUpperCase();
                              const personGender = nextPerson.gender || 'F';

                              // Always call building function to ensure placeholders are created if no relations exist
                              buildNodesFromRelationsForNextFlow(response, personGender, selectedNode.id);

                              // 3. Fetch generation info for the new person
                              fetchGenerationInfo(nextPerson.id);

                              // 4. Move transform to center on the NEW focus node
                              setTransform({
                                x: -selectedNode.position.x * 0.8,
                                y: -selectedNode.position.y * 0.8,
                                scale: 0.8
                              });

                              // ✅ Calculate relation before updating history
                              const path = getPathToNode(selectedNode);
                              const calcRelResult = await calculateRelationFromPath(path);

                              // 5. Update active focus so other branches dim
                              setActiveParentId(selectedNode.id);

                              // 6. ✅ Update navigation history name and personId (if it was a placeholder)
                              setNavigationHistory(prev => {
                                const newHistory = [...prev];
                                const lastIndex = newHistory.length - 1;
                                if (lastIndex >= 0 && newHistory[lastIndex].id === selectedNode.id) {
                                  newHistory[lastIndex] = {
                                    ...newHistory[lastIndex],
                                    name: personName,
                                    personId: nextPerson.id,
                                    calculatedRelation: calcRelResult?.label
                                  };
                                }
                                return newHistory;
                              });

                              toast.success(`Viewing ${personName}'s tree`);
                            }
                          } catch (e) {
                            console.error("Error in next flow:", e);
                            toast.error("Failed to load connected person");
                          }
                        } else {
                          // Logic for placeholders or special cases if needed
                          if (selectedNode.relation === 'Ashramam') {
                            expandAshramam(selectedNode.id);
                          } else {
                            // Always center and focus even for placeholder expansion
                            setTransform({
                              x: -selectedNode.position.x * 0.8,
                              y: -selectedNode.position.y * 0.8,
                              scale: 0.8
                            });
                            setActiveParentId(selectedNode.id);
                            expandNode(selectedNode.id);
                          }
                        }
                        setShowModal(false);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors"
                    >
                      <span className="flex items-center"><Flower2 size={20} className="mr-3" /> {t('nextFlower')}</span>
                      <span>→</span>
                    </button>

                    {/* Add People button */}
                    <button
                      onClick={handleAddPeopleClick}
                      className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors shadow-lg"
                    >
                      <span className="flex items-center">
                        <UserPlus size={20} className="mr-3" /> {t('addPeople')}
                      </span>
                      <span>→</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddPeopleModal && selectedNode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white uppercase">{selectedNode.relation}</h2>
                  <p className="text-slate-400 text-sm mt-1">{t('enterName')}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddPeopleModal(false);
                    setAddingPeopleName('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                  disabled={isSavingAddedPeople}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    {selectedNode.relation}'s {t('newName')}
                  </label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                    <input
                      type="text"
                      value={addingPeopleName}
                      onChange={(e) => setAddingPeopleName(e.target.value)}
                      placeholder={t('enterNewName')}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isSavingAddedPeople}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowAddPeopleModal(false);
                      setAddingPeopleName('');
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                    disabled={isSavingAddedPeople}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveAddedPeople}
                    disabled={isSavingAddedPeople || !addingPeopleName.trim()}
                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingAddedPeople ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('loading')}
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {t('save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNameEditModal && selectedNode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('enterName')}</h2>
                </div>
                <button
                  onClick={() => {
                    setShowNameEditModal(false);
                    setEditingName('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                  disabled={isSavingName}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    {t('newName')}
                  </label>
                  <div className="relative">
                    <Edit className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      placeholder={t('enterNewName')}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      disabled={isSavingName}
                      autoFocus
                    />
                  </div>

                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowNameEditModal(false);
                      setEditingName('');
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                    disabled={isSavingName}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={handleSaveName}
                    disabled={isSavingName || !editingName.trim() || editingName.trim() === selectedNode.name}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingName ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('loading')}
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        {t('save')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPhoneModal && selectedNode && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('sendInvitationTitle')}</h2>
                  <p className="text-slate-400 text-sm">
                    {t('inviteToJoin')} {selectedNode.name} as {selectedNode.relation}
                    {/* Show father info if available */}
                    {selectedNode.parentId && nodes[selectedNode.parentId] && nodes[selectedNode.parentId].id !== 'root' &&
                      (selectedNode.relation.toLowerCase().includes('son') || selectedNode.relation.toLowerCase().includes('daughter')) && (
                        <span className="block text-amber-300 text-xs mt-1">
                          Will be linked to father: {nodes[selectedNode.parentId].name}
                        </span>
                      )}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowPhoneModal(false);
                    setPhoneNumber('');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                  disabled={isSendingInvitation}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-2">
                    {t('mobileNumber')}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setPhoneNumber(value);
                        if (invitationError) setInvitationError(null);
                      }}
                      placeholder={t('enterMobile')}
                      maxLength={10}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      disabled={isSendingInvitation}
                    />
                    {isSearchingMobile && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-500"></div>
                      </div>
                    )}
                  </div>

                  {/* Search Results in Modal - Using the new API response format */}
                  {mobileSearchResults.length > 0 && (
                    <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto shadow-xl">
                      {mobileSearchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => {
                            setPhoneNumber(result.mobile_number || result.value);
                            setMobileSearchResults([]);
                            handleMobileSearch(result.mobile_number || result.value);
                          }}
                          className="w-full text-left px-4 py-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors text-sm border-b border-slate-700 last:border-0 flex items-center justify-between"
                        >
                          <span>{result.label}</span>
                          <ChevronRight size={14} className="text-slate-500" />
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="text-slate-500 text-xs mt-2">
                    {t('enterOtpHint')}
                  </p>

                  {/* Error Message Display inside the modal */}
                  {invitationError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 animate-shake"
                    >
                      <Info size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-red-500 text-xs font-semibold leading-relaxed">
                        {invitationError}
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowPhoneModal(false);
                      setPhoneNumber('');
                    }}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors text-xs font-semibold"
                    disabled={isSendingInvitation}
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => handleMobileSearch(phoneNumber)}
                    disabled={isSearching || !phoneNumber.trim()}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-xs font-semibold"
                  >
                    <Search size={16} />
                    {isTamil ? 'தேடு' : 'Search'}
                  </button>
                  <button
                    onClick={handleSendInvitation}
                    disabled={isSendingInvitation || !phoneNumber.trim()}
                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold"
                  >
                    {isSendingInvitation ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {t('loading')}
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        {t('send')}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};

export default GenealogyPage;
