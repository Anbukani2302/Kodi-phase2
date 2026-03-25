
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
// import { pageTransitionService, createPageKey, usePageTransition } from '../services/pageTransitionService';
import LoadingOverlay from './LoadingOverlay';
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
Info,
Eye,
Heart,
ArrowLeft,
Download
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

// ============ TYPES ============

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

interface HoverInfo {
label: string;
englishLabel: string;
explanation: string;
path: string[];
fromPersonName: string;
isLoading: boolean;
position?: { x: number; y: number };
nodeId?: string;
}

interface MobileSearchResult {
id: number;
mobile_number: string;
label: string;
value: string;
}

interface InvitationPathVisual {
step: number;
person: {
  id: number | null;
  name: string;
  profile_picture: string | null;
  gender: string | null;
  is_current_user: boolean;
};
relation_to_next: string | null;
relation_label: string | null;
direction: string;
step_type: string;
}

// Path navigation types
interface PathStep {
relation_code: string;
relation_label: string;
person_id?: number;
person_name?: string;
}

interface RelationshipPath {
path_string: string;
path: PathStep[];
total_steps: number;
}

// ============ CONSTANTS ============

const RADIUS_BASE = 240;
const ALL_RELATIONS = [
'Father', 'Mother', 'Elder Brother', 'Elder Sister', 'Son',
'Daughter', 'Husband', 'Wife', 'Ashramam', 'Younger Brother', 'Younger Sister'
];

// ============ HELPER FUNCTIONS ============

const getFullImageUrl = (imagePath: string | null | undefined): string | null => {
if (!imagePath) return null;
if (typeof imagePath !== 'string') return null;
if (imagePath.startsWith('http')) return imagePath;

const cleanBase = BASE_URL.replace(/\/$/, '');
const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
return `${cleanBase}${cleanPath}`;
};

const mapRelationToAPI = (uiRelation: string): string => {
if (!uiRelation || typeof uiRelation !== 'string') return '';

if (uiRelation === 'Ashramam Member') {
  return 'ASHRAMAM_MEMBER';
}

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

const mapAPIToUIRelation = (apiRelationCode: string): string => {
if (!apiRelationCode || typeof apiRelationCode !== 'string') return '';

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

const getDisplayLabel = (relationLabelData: any, isNextFlow: boolean = false): string => {
if (isNextFlow) {
  if (relationLabelData && relationLabelData.source === 'inverse_to_me' && relationLabelData.user_label) {
    return relationLabelData.user_label;
  }
  return relationLabelData?.label || '';
}

if (relationLabelData && relationLabelData.source === 'inverse_from_me' && relationLabelData.user_label) {
  return relationLabelData.user_label;
}

return relationLabelData?.label || '';
};

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

const getInverseRelation = (relation: string, recipientGender: string = 'M'): string => {
const gender = recipientGender?.toUpperCase() || 'M';

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
  'Younger Sister': gender === 'M' ? 'Elder Sister' : 'Younger Brother',
  'Ashramam': 'Ashramam Member',
  'Ashramam Member': 'Ashramam'
};

return inverseMap[relation] || relation;
};

const getMeLabel = (parentGender: string, relation: string, isTamil: boolean = false): string => {
const gender = parentGender?.toUpperCase() || 'M';

const isElderBrother = relation === 'Elder Brother';
const isYoungerBrother = relation === 'Younger Brother';
const isElderSister = relation === 'Elder Sister';
const isYoungerSister = relation === 'Younger Sister';
const isBrother = relation === 'Brother';
const isSister = relation === 'Sister';

const isSibling = isElderBrother || isYoungerBrother || isElderSister || isYoungerSister || isBrother || isSister;
const isChild = ['Son', 'Daughter'].includes(relation);
const isSpouse = ['Husband', 'Wife'].includes(relation);
const isParent = ['Father', 'Mother'].includes(relation);

if (gender === 'F') {
  if (isTamil) {
    if (isElderBrother || isElderSister) return 'தங்கை';
    if (isYoungerBrother || isYoungerSister) return 'அக்கா';
    if (isBrother || isSister) return 'சகோதரி';
    if (isChild) return 'அம்மா';
    if (isSpouse) return 'மனைவி';
    if (isParent) return 'மகள்';
    if (relation === 'Ashramam' || relation === 'Ashramam Member') return 'உறுப்பினர்';
    return 'மகள்';
  } else {
    if (isElderBrother || isElderSister) return 'Younger Sister';
    if (isYoungerBrother || isYoungerSister) return 'Elder Sister';
    if (isBrother || isSister) return 'Sister';
    if (isChild) return 'Mother';
    if (isSpouse) return 'Wife';
    if (isParent) return 'Daughter';
    if (relation === 'Ashramam' || relation === 'Ashramam Member') return 'Member';
    return 'Daughter';
  }
} else {
  if (isTamil) {
    if (isElderBrother || isElderSister) return 'தம்பி';
    if (isYoungerBrother || isYoungerSister) return 'அண்ணன்';
    if (isBrother || isSister) return 'சகோதரன்';
    if (isChild) return 'அப்பா';
    if (isSpouse) return 'கணவன்';
    if (isParent) return 'மகன்';
    if (relation === 'Ashramam' || relation === 'Ashramam Member') return 'உறுப்பினர்';
    return 'மகன்';
  } else {
    if (isElderBrother || isElderSister) return 'Younger Brother';
    if (isYoungerBrother || isYoungerSister) return 'Elder Brother';
    if (isBrother || isSister) return 'Brother';
    if (isChild) return 'Father';
    if (isSpouse) return 'Husband';
    if (isParent) return 'Son';
    if (relation === 'Ashramam' || relation === 'Ashramam Member') return 'Member';
    return 'Son';
  }
}
};

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

const getArrowLabel = (parentGender: string, relation: string, relationLabel: string, isTamil: boolean = false): string => {
const meLabel = getMeLabel(parentGender, relation, isTamil);
return `${meLabel} – ${relationLabel}`;
};

// ============ ROUGH CIRCLE HELPER ============

// ============ ROUGH CIRCLE HELPER (Fixed - maintains circle shape with rough edges) ============

/**
* Generates a circle path with rough/imperfect edges but maintains circular shape
* @param cx Center X
* @param cy Center Y
* @param r Radius
* @param roughness Amount of edge roughness (0.02 = subtle, 0.1 = noticeable, 0.2 = very rough)
* @param segments Number of segments (more segments = smoother circle but still rough edges)
* @returns SVG path string
*/
const generateRoughCirclePath = (cx: number, cy: number, r: number, roughness: number = 0.08, segments: number = 24): string => {
let path = '';
const angleStep = (2 * Math.PI) / segments;

// Deterministic randomness based on position for consistent but varied results
const seed = (cx * 100 + cy * 10) % 1;

for (let i = 0; i <= segments; i++) {
  const angle = i * angleStep;

  // Calculate base position on perfect circle
  const baseX = cx + r * Math.cos(angle);
  const baseY = cy + r * Math.sin(angle);

  // Add small perpendicular offset for roughness (maintains circular shape)
  const perpendicularAngle = angle + Math.PI / 2; // Perpendicular direction
  const randomOffset = (Math.sin(cx * i * 0.5 + cy * 0.3 + i * 1.2) * 0.5 + 0.5) * roughness * r * 0.15;

  const x = baseX + Math.cos(perpendicularAngle) * randomOffset;
  const y = baseY + Math.sin(perpendicularAngle) * randomOffset;

  if (i === 0) {
    path += `M ${x},${y} `;
  } else {
    // Use cubic Bezier for smoother connection between points
    const prevAngle = (i - 1) * angleStep;

    // Control points for smooth curve
    const cp1x = cx + r * Math.cos(prevAngle + angleStep * 0.3) +
      Math.cos(prevAngle + Math.PI / 2) * randomOffset * 0.7;
    const cp1y = cy + r * Math.sin(prevAngle + angleStep * 0.3) +
      Math.sin(prevAngle + Math.PI / 2) * randomOffset * 0.7;

    const cp2x = cx + r * Math.cos(angle - angleStep * 0.3) +
      Math.cos(angle - Math.PI / 2) * randomOffset * 0.7;
    const cp2y = cy + r * Math.sin(angle - angleStep * 0.3) +
      Math.sin(angle - Math.PI / 2) * randomOffset * 0.7;

    path += `C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y} `;
  }
}

path += 'Z';
return path;
};
// ============ PATH NAVIGATION SERVICE (Integrated) ============

class PathNavigationService {
private static instance: PathNavigationService;
private isProcessing = false;

static getInstance(): PathNavigationService {
  if (!PathNavigationService.instance) {
    PathNavigationService.instance = new PathNavigationService();
  }
  return PathNavigationService.instance;
}

mapRelationCodeToUI(relationCode: string): string {
  const map: Record<string, string> = {
    'FATHER': 'Father',
    'MOTHER': 'Mother',
    'SON': 'Son',
    'DAUGHTER': 'Daughter',
    'ELDER_BROTHER': 'Elder Brother',
    'YOUNGER_BROTHER': 'Younger Brother',
    'ELDER_SISTER': 'Elder Sister',
    'YOUNGER_SISTER': 'Younger Sister',
    'HUSBAND': 'Husband',
    'WIFE': 'Wife',
    'SELF': 'Self',
    'ME': 'Me'
  };
  return map[relationCode] || relationCode;
}
}

const pathNavigationService = PathNavigationService.getInstance();

// ============ HONEYCOMB BACKGROUND ============

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

// ============ MAIN COMPONENT ============

const GenealogyPage = () => {
const { t, language } = useLanguage();
const location = useLocation();
const isTamil = language === 'ta';

// Temporarily disable page transition to isolate error
// const pageKey = createPageKey('/genealogy');
// const { saveState, getState, markActive, markInactive } = usePageTransition(pageKey);

// Mark page as active on mount - simplified
useEffect(() => {
  console.log('📂 GenealogyPage mounted');
  return () => {
    console.log('📂 GenealogyPage unmounted');
  };
}, []);

// ============ STATE ============

// Node state
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
const rootNodeId = Object.keys(nodes).find(
  id => nodes[id].id === "root"
);
// Profile and person state
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
const [selectedNodeCalculatedRelation, setSelectedNodeCalculatedRelation] = useState<any>(null);

// Modal states
const [showModal, setShowModal] = useState(false);
const [showPhoneModal, setShowPhoneModal] = useState(false);
const [showNameEditModal, setShowNameEditModal] = useState(false);
const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
const [showAddAshramamModal, setShowAddAshramamModal] = useState(false);

// Form states
const [phoneNumber, setPhoneNumber] = useState('');
const [editingName, setEditingName] = useState('');
const [addingPeopleName, setAddingPeopleName] = useState('');
const [newAshramamName, setNewAshramamName] = useState('');
const [newAshramamRelation, setNewAshramamRelation] = useState('');
const [newAshramamGender, setNewAshramamGender] = useState('M');
const [newAshramamFirstRelation, setNewAshramamFirstRelation] = useState('');


// Loading states
const [isSavingName, setIsSavingName] = useState(false);
const [isSendingInvitation, setIsSendingInvitation] = useState(false);
const [isSavingAddedPeople, setIsSavingAddedPeople] = useState(false);
const [isSavingAshramamRelative, setIsSavingAshramamRelative] = useState(false);
const [isLoadingRelations, setIsLoadingRelations] = useState(false);
const [isLoadingPerson, setIsLoadingPerson] = useState(false);
const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
const [isSearching, setIsSearching] = useState(false);
const [isSearchingMobile, setIsSearchingMobile] = useState(false);
const [isLoadingGenerationInfo, setIsLoadingGenerationInfo] = useState(false);

// Transform and interaction states
const [transform, setTransform] = useState({ x: 0, y: 0, scale: 0.3 });
const [isDragging, setIsDragging] = useState(false);
const dragStart = useRef({ x: 0, y: 0 });
const containerRef = useRef<HTMLDivElement>(null);
const touchStartDist = useRef<number | null>(null);
const touchStartCenter = useRef({ x: 0, y: 0 });
const sidePanelScrollRef = useRef<HTMLDivElement>(null);

// Ashramam state
const [ashramamExtraRelations, setAshramamExtraRelations] = useState<any[]>([]);
const [ashramamStandardOptions, setAshramamStandardOptions] = useState<any[]>([]);

// Navigation history
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

// Active invitations
const [activeInvitations, setActiveInvitations] = useState<Array<{
  personId: number;
  personName: string;
  relation: string;
  timestamp: number;
  phoneNumber: string;
  fatherName?: string;
}>>([]);

// Generation info
const [generationInfo, setGenerationInfo] = useState<GenerationInfo | null>(null);

// Search states
const [searchQuery, setSearchQuery] = useState('');
const [showSearchResults, setShowSearchResults] = useState(false);
const [filteredButtons, setFilteredButtons] = useState<Array<{ id: number, label: string, image: string }>>([]);
const [searchMobile, setSearchMobile] = useState('');
const [mobileSearchResults, setMobileSearchResults] = useState<MobileSearchResult[]>([]);
const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
const [pathLength, setPathLength] = useState<number>(0);
const [isPathNavigation, setIsPathNavigation] = useState<boolean>(false);
const [pathNodes, setPathNodes] = useState<any[]>([]);

// Hover states
const [hoverPath, setHoverPath] = useState<string[]>([]);
const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);
const [invitationError, setInvitationError] = useState<string | null>(null);
const [hoverElement, setHoverElement] = useState<HTMLElement | null>(null);
const [isCalculatingRelation, setIsCalculatingRelation] = useState(false);
const hoverPathRef = useRef<string[]>([]);

// Invitation view states
const [invitationData, setInvitationData] = useState<any>(null);
const [showInvitationBanner, setShowInvitationBanner] = useState(false);
const [blinkingPersonId, setBlinkingPersonId] = useState<number | null>(null);

// ============ NEW: Path navigation states ============
const [isNavigatingPath, setIsNavigatingPath] = useState(false);
const [currentPathStep, setCurrentPathStep] = useState(0);
const [targetPathNodeId, setTargetPathNodeId] = useState<string | null>(null);
const [blinkingNodeId, setBlinkingNodeId] = useState<string | null>(null);
const [relationshipPath, setRelationshipPath] = useState<RelationshipPath | null>(null);
const [pathString, setPathString] = useState<string>('');
const [blinkingNodeInfo, setBlinkingNodeInfo] = useState<{
  personId: number;
  nodeId: string;
  personName: string;
} | null>(null);
const [lastNodeInfo, setLastNodeInfo] = useState<{
  personId: number;
  nodeId: string;
  personName: string;
  pathString: string;
} | null>(null);
const [showPathInfoModal, setShowPathInfoModal] = useState(false);
const [pathNodeIds, setPathNodeIds] = useState<Set<number>>(new Set());

// UI states
const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(null);
const [showSidePanel, setShowSidePanel] = useState(true);
const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

// Refs
const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
const hasAutoExpanded = useRef(false);

// Top buttons
const topButtons = [
  { id: 1, label: isTamil ? 'உறவினர்\nபட்டியல்' : 'Relative\nList', image: relation1Img },
  { id: 2, label: isTamil ? 'பதிவிறக்க\nவசதிகள்' : 'Download\nOptions', image: connectImg },
  { id: 3, label: isTamil ? 'கலாச்சார\nபெட்டகம்' : 'Cultural\nBox', image: kalacharamImg },
  { id: 4, label: isTamil ? 'இருவருக்கான\nஉறவுமுறை\nபற்றி அறிய' : 'Know\nRelationship', image: mapImg },
  { id: 5, label: isTamil ? 'அரட்டை [Chat]' : 'Chat', image: connectionImg },
  { id: 6, label: isTamil ? 'அமைப்பு\n[Settings]' : 'Settings', image: settingImg },
];

// ============ EFFECTS ============

// Disable body scroll
useEffect(() => {
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = 'auto';
  };
}, []);

// Check for invitation data from navigation state
useEffect(() => {
  const state = location.state as any;
  if (state?.invitationData) {
    console.log("Invitation data received from navigation:", state.invitationData);
    setInvitationData(state.invitationData);

    // ============ NEW: Set relationship path for visualization ============
    if (state.invitationData.relationship_path) {
      console.log("Relationship path found:", state.invitationData.relationship_path);
      setRelationshipPath(state.invitationData.relationship_path);
      setupPathVisualization(state.invitationData);
    }

    // Extract connection path from invitation data
    const pathVisual = state.invitationData.path_visual || [];
    if (pathVisual.length > 0) {
      console.log("Connection path found:", pathVisual);
      setConnectionPathNodes(pathVisual);
      setShowConnectionPath(true);

      setTimeout(() => {
        setShowConnectionPath(false);
      }, 5000);
    }

    setShowInvitationBanner(false);

    if (state.invitationData?.invitation?.person?.id) {
      const personId = Number(state.invitationData.invitation.person.id);
      setTimeout(() => {
        navigateToPersonById(personId);
      }, 1000);
    }
  }
}, [location.state]);

// Setup path visualization - Only make the SECOND node (my father) blink red
const setupPathVisualization = useCallback((data: any) => {
  if (!data.relationship_path || !data.relationship_path.path) return;

  const path = data.relationship_path.path;
  const pathString = data.relationship_path.path_string || '';

  console.log("Setting up path visualization with path:", path);
  console.log("Full path string:", pathString);

  // Store the complete path for reference
  setPathNodes(path);
  setPathString(pathString);

  // Track all person IDs in the path (excluding self)
  const pathPersonIds = new Set<number>();
  path.forEach((step: any) => {
    if (step.person_id && step.step_type !== 'self') {
      pathPersonIds.add(step.person_id);
    }
  });
  setPathNodeIds(pathPersonIds);

  // According to the response:
  // path[0] = othwe (center node - recipient)
  // path[1] = my father (intermediate node - should blink red)
  // path[2] = vasanth (last node in path - sender)

  // The LAST node in the path (index 2 - vasanth)
  const lastNodeIndex = path.length - 1;
  const lastNode = path[lastNodeIndex];

  // The INTERMEDIATE node that should blink (index 1 - my father)
  const blinkingNode = path[1];

  console.log("Blinking node (should blink red):", blinkingNode);
  console.log("Last node (sender - where path ends):", lastNode);

  // Store last node info
  if (lastNode) {
    setLastNodeInfo({
      personId: lastNode.person_id,
      nodeId: '',
      personName: lastNode.person_name,
      pathString: pathString
    });
  }

  // Store blinking node info
  if (blinkingNode) {
    setBlinkingNodeInfo({
      personId: blinkingNode.person_id,
      nodeId: '',
      personName: blinkingNode.person_name
    });
  }

  // Set blinking ONLY for the blinking node (my father) - index 1
  if (blinkingNode) {
    console.log("Setting blinking highlight for blinking node:",
      blinkingNode.person_name, blinkingNode.person_id);
    setBlinkingPersonId(blinkingNode.person_id);

    // Find which node ID corresponds to this person in our tree
    setTimeout(() => {
      // After nodes are built, find the nodeId for this person
      const nodeId = Object.keys(nodes).find(key =>
        nodes[key].personId === blinkingNode.person_id
      );

      if (nodeId) {
        console.log(`Found nodeId ${nodeId} for blinking person ${blinkingNode.person_id}`);
        setBlinkingNodeId(nodeId);
        setBlinkingNodeInfo(prev => ({
          ...prev!,
          nodeId: nodeId
        }));

        // Center view on this node
        const node = nodes[nodeId];
        if (node) {
          setTransform({
            x: -node.position.x * 0.8,
            y: -node.position.y * 0.8,
            scale: 0.8
          });
        }
      }
    }, 1000);
  }

  // Find the last node in the tree
  if (lastNode) {
    setTimeout(() => {
      const lastNodeId = Object.keys(nodes).find(key =>
        nodes[key].personId === lastNode.person_id
      );

      if (lastNodeId) {
        console.log(`Found last node ${lastNodeId} for person ${lastNode.person_id}`);
        setLastNodeInfo(prev => ({
          ...prev!,
          nodeId: lastNodeId
        }));
      }
    }, 1000);
  }

  // Stop blinking after 30 seconds
  setTimeout(() => {
    console.log("Auto-stopping blinking highlight after 30 seconds");
    setBlinkingPersonId(null);
    setBlinkingNodeId(null);
  }, 30000);
}, [nodes]);

// Auto-scroll side panel
useEffect(() => {
  if (sidePanelScrollRef.current) {
    sidePanelScrollRef.current.scrollTo({
      top: sidePanelScrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }
}, [navigationHistory]);

// ============ PATH NAVIGATION METHODS ============
const navigatePathVisualization = async (path: RelationshipPath) => {
  const rootNodeId = Object.keys(nodes).find(id => nodes[id].id === "root");

  if (!rootNodeId) {
    console.log("Root node not found");
    return;
  }

  setIsNavigatingPath(true);
  setCurrentPathStep(0);
  setRelationshipPath(path);

  // Get the path steps - skip the first one (SELF)
  const pathSteps = path.path.slice(1);
  console.log("Path steps to navigate:", pathSteps);

  let currentNodeId = rootNodeId;

  // Navigate through each step sequentially
  for (let i = 0; i < pathSteps.length; i++) {
    const currentStep = pathSteps[i];
    const uiRelation = pathNavigationService.mapRelationCodeToUI(currentStep.relation_code);

    console.log(`Step ${i + 1}: Looking for "${uiRelation}" from node ${currentNodeId}`);

    // Check if this is the last node (target person)
    const isLastNode = (i === pathSteps.length - 1);

    // Expand current node to reveal children
    await expandNode(currentNodeId);
    await new Promise(r => setTimeout(r, 800));

    // Get children of current node
    const children = getNodeChildren(currentNodeId);

    // Find the next node based on relation
    const nextNode = children.find(child =>
      child.relation?.toLowerCase() === uiRelation?.toLowerCase()
    );

    if (!nextNode) {
      console.error(`Could not find node with relation "${uiRelation}" under node ${currentNodeId}`);
      toast.error(`Path broken: Cannot find ${uiRelation}`);
      setIsNavigatingPath(false);
      setBlinkingNodeId(null);
      return;
    }

    console.log(`Found node: ${nextNode.id} (${nextNode.name}) - isLastNode: ${isLastNode}`);

    // If this is the last node, blink it and stop
    if (isLastNode) {
      console.log("REACHED FINAL NODE - BLINKING RED");

      // Center on the final node
      setTransform({
        x: -nextNode.position.x * 0.8,
        y: -nextNode.position.y * 0.8,
        scale: 0.8
      });

      // Set as active parent
      setActiveParentId(nextNode.id);

      // Add to navigation history
      const pathToNode = getPathToNode(nextNode);
      const calcRel = await calculateRelationFromPath(pathToNode);
      addToNavigationHistory(nextNode, calcRel?.label);

      // BLINK ONLY THE FINAL NODE
      setBlinkingNodeId(nextNode.id);
      setTargetPathNodeId(nextNode.id);

      // Stop blinking after 5 seconds
      setTimeout(() => {
        setBlinkingNodeId(null);
        setTargetPathNodeId(null);
      }, 5000);

      break;
    }

    // For intermediate nodes, just update currentNodeId for next iteration
    // NO BLINKING for intermediate nodes
    console.log(`Intermediate node - moving to next step without blinking`);
    currentNodeId = nextNode.id;

    // Small delay before next step
    await new Promise(r => setTimeout(r, 500));
  }

  setIsNavigatingPath(false);
};

// Also update the Next Flower click handler
const handleNextFlowerClick = async (node: UniverseNode) => {
  console.log("Next Flower clicked for node:", node);

  if (node.isUpdated && node.personId) {
    try {
      toast.loading(isTamil ? 'அடுத்த நிலைக்கு செல்கிறது...' : 'Going to next level...', { id: 'next-flower' });

      const response = await genealogyService.getNextFlow(node.personId);
      console.log("Next Flow response:", response);

      const nextPerson = (response as any).person;
      const permissions = (response as any).permissions;

      if (nextPerson) {
        const personName = (nextPerson.full_name || nextPerson.name || node.name).toUpperCase();
        const personGender = nextPerson.gender || 'F';

        // Build relations for this node
        buildNodesFromRelationsForNextFlow(response, personGender, node.id);

        // Fetch generation info
        if (nextPerson.id) {
          fetchGenerationInfo(nextPerson.id);
        }

        // Center on this node
        setTransform({
          x: -node.position.x * 0.8,
          y: -node.position.y * 0.8,
          scale: 0.8
        });

        // Set as active parent
        setActiveParentId(node.id);

        // Update navigation history
        const path = getPathToNode(node);
        const calcRelResult = await calculateRelationFromPath(path);

        setNavigationHistory(prev => {
          const newHistory = [...prev];
          const lastIndex = newHistory.length - 1;

          // Check if this node is already in history
          const existingIndex = newHistory.findIndex(item => item.id === node.id);

          if (existingIndex !== -1) {
            // Update existing entry
            newHistory[existingIndex] = {
              ...newHistory[existingIndex],
              name: personName,
              personId: nextPerson.id,
              calculatedRelation: calcRelResult?.label
            };
            return newHistory.slice(0, existingIndex + 1);
          } else {
            // Add new entry
            return [...newHistory, {
              id: node.id,
              name: personName,
              relation: node.relation,
              personId: nextPerson.id,
              level: node.level,
              timestamp: Date.now(),
              calculatedRelation: calcRelResult?.label
            }];
          }
        });

        toast.success(`${personName} loaded`, { id: 'next-flower' });

        // Check if this node is the target of path navigation
        if (relationshipPath && targetPathNodeId === node.id) {
          console.log("This is the target node - keeping blink active");
          // Already blinking from path navigation
        }
      }
    } catch (error) {
      console.error("Error in next flow:", error);
      toast.error(isTamil ? 'அடுத்த நிலைக்கு செல்ல முடியவில்லை' : 'Failed to load next level', { id: 'next-flower' });
    }
  } else {
    // For placeholder nodes, just expand
    setTransform({
      x: -node.position.x * 0.8,
      y: -node.position.y * 0.8,
      scale: 0.8
    });
    setActiveParentId(node.id);
    expandNode(node.id);
  }
};

// Next Flower click handler for blinking node - 100% FIXED VERSION
const handleNextFlowerClickForBlinkingNode = async () => {
  if (!selectedNode) {
    console.log("No selected node");
    return;
  }

  console.log("🎯 Next Flower clicked for blinking node:", selectedNode);
  console.log("Full response path:", pathNodes);

  // 🛑 CRITICAL: Find current node's position in the path
  const currentNodeIndex = pathNodes.findIndex((step: any) =>
    Number(step.person_id) === Number(selectedNode.personId)
  );

  console.log(`Current node index in path: ${currentNodeIndex}, Total path length: ${pathNodes.length}`);

  // 🛑 CRITICAL: If this is the last node, STOP IMMEDIATELY - NO CREATION
  if (currentNodeIndex === pathNodes.length - 1) {
    console.log("🛑 STOP: This is the last node in path - no further navigation");
    toast(isTamil ? 'இதுவே கடைசி நபர்' : 'This is the last person');
    setShowModal(false);
    setShowPathInfoModal(true);
    return; // ✅ MUST return - no code after this runs
  }

  // If node not found in path, don't proceed
  if (currentNodeIndex === -1) {
    console.log("Node not found in path");
    setShowModal(false);
    return;
  }

  try {
    toast.loading(isTamil ? 'பாதையை காட்டுகிறது...' : 'Showing path...', { id: 'expand-node' });

    // Get the next node from response path
    const nextNode = pathNodes[currentNodeIndex + 1];

    if (!nextNode || !nextNode.person_id) {
      console.error("Next node not found in response");
      toast.error("Path information missing");
      setShowModal(false);
      return;
    }

    console.log(`Creating next node from response (index ${currentNodeIndex + 1}):`, nextNode);

    // Mark current node as open
    setNodes(prev => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        isOpen: true
      }
    }));

    // ONLY create the specific next node from response
    setNodes(prev => {
      const sourceNode = prev[selectedNode.id];
      if (!sourceNode) return prev;

      const nextNodes = { ...prev };

      // Calculate position
      const existingChildren = Object.values(prev).filter(n => n.parentId === selectedNode.id);
      const angle = existingChildren.length * (Math.PI / 3);
      const radius = RADIUS_BASE;

      // Map relation from response
      let relation = 'Son';
      if (nextNode.relation_code === 'SON') relation = 'Son';
      else if (nextNode.relation_code === 'DAUGHTER') relation = 'Daughter';
      else if (nextNode.relation_code === 'FATHER') relation = 'Father';
      else if (nextNode.relation_code === 'MOTHER') relation = 'Mother';

      const childId = `${selectedNode.id}-path-${nextNode.person_id}`;

      nextNodes[childId] = {
        id: childId,
        name: nextNode.person_name.toUpperCase(),
        relation: relation,
        relationLabel: getRelationLabel(relation, isTamil),
        level: sourceNode.level + 1,
        parentId: selectedNode.id,
        position: {
          x: sourceNode.position.x + Math.cos(angle) * radius,
          y: sourceNode.position.y + Math.sin(angle) * radius
        },
        isOpen: false,
        gender: nextNode.gender || (relation === 'Daughter' ? 'F' : 'M'),
        personId: nextNode.person_id,
        isUpdated: true,
        isConnected: nextNode.is_current_user || false
      };

      console.log(`✅ Created path node: ${childId} - ${nextNode.person_name}`);
      return nextNodes;
    });

    // Center view
    setTransform({
      x: -selectedNode.position.x * 0.8,
      y: -selectedNode.position.y * 0.8,
      scale: 0.8
    });

    setActiveParentId(selectedNode.id);
    setShowModal(false);

    toast.success(isTamil ? `${nextNode.person_name} காட்டப்படுகிறது` : `Showing ${nextNode.person_name}`, { id: 'expand-node' });

  } catch (error) {
    console.error("Error:", error);
    toast.error(isTamil ? 'பாதையை காட்ட முடியவில்லை' : 'Failed to show path');
    setShowModal(false);
  }
};

/**
 * Gets children of a node
 */
const getNodeChildren = useCallback((nodeId: string) => {
  return Object.values(nodes).filter(n => n.parentId === nodeId);
}, [nodes]);

/**
 * Navigate to a person by ID
 */
const navigateToPersonById = async (personId: number) => {
  try {
    toast.loading(isTamil ? 'நபரை ஏற்றுகிறது...' : 'Loading person...', { id: 'nav-person' });

    const personData = await genealogyService.getPersonDetails(personId);

    if (personData) {
      const newNode: UniverseNode = {
        id: `person-${personData.id}`,
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

      const relationsData = await genealogyService.getPersonRelations(personData.id);

      setNodes({
        [newNode.id]: newNode
      });

      buildNodesFromRelations(relationsData, personData.gender, newNode.id);
      setActiveParentId(newNode.id);

      setTransform({ x: 0, y: 0, scale: 0.8 });

      setNavigationHistory([{
        id: newNode.id,
        name: newNode.name,
        relation: 'Self',
        personId: newNode.personId,
        level: 0,
        timestamp: Date.now(),
        calculatedRelation: isTamil ? 'நான்' : 'Me'
      }]);

      toast.success(isTamil ? 'நபர் ஏற்றப்பட்டார்' : 'Person loaded', { id: 'nav-person' });
    }
  } catch (error) {
    console.error("Error navigating to person:", error);
    toast.error(isTamil ? 'நபரை ஏற்ற முடியவில்லை' : 'Failed to load person', { id: 'nav-person' });
  }
};

// ============ HOVER HANDLER FUNCTIONS ============

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

  const lowerCode = relationCode.toLowerCase().trim();
  if (relationMap[lowerCode]) {
    return relationMap[lowerCode];
  }

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

  return relationCode;
}, []);

const calculateRelationFromPath = useCallback(async (pathElements: string[]) => {
  if (pathElements.length === 0) return null;

  try {
    setIsCalculatingRelation(true);

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

const handleNodeHoverEnter = useCallback(async (node: UniverseNode, event: React.MouseEvent | React.TouchEvent) => {
  const isHighlighted = !activeParentId ||
    node.id === activeParentId ||
    node.parentId === activeParentId;

  if (!isHighlighted) return;

  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    setHoverTimeout(null);
  }

  setHoverInfo(null);

  let clientX: number, clientY: number;

  if ('touches' in event) {
    clientX = (event as React.TouchEvent).touches[0].clientX;
    clientY = (event as React.TouchEvent).touches[0].clientY;
  } else {
    clientX = (event as React.MouseEvent).clientX;
    clientY = (event as React.MouseEvent).clientY;
  }

  if (event.currentTarget) {
    setHoverElement(event.currentTarget as HTMLElement);
  }

  if (node.id === 'root' || node.id === activeParentId) {
    const hoverData: HoverInfo = {
      label: node.name,
      englishLabel: node.relation,
      explanation: isTamil ? 'நீங்கள் இப்போது இங்கே இருக்கிறீர்கள்' : 'You are currently here',
      path: [],
      fromPersonName: nodes['root']?.name || 'You',
      isLoading: false,
      position: { x: clientX, y: clientY },
      nodeId: node.id
    };
    setHoverInfo(hoverData);
    return;
  }

  const path = getPathToNode(node);

  console.log("Calculated hover path for node:", node.id, path);
  hoverPathRef.current = path;
  setHoverPath(path);

  const loadingData: HoverInfo = {
    label: '...',
    englishLabel: 'Calculating...',
    explanation: 'Finding relationship...',
    path: path,
    fromPersonName: nodes['root']?.name || 'You',
    isLoading: true,
    position: { x: clientX, y: clientY },
    nodeId: node.id
  };
  setHoverInfo(loadingData);

  const timeout = setTimeout(async () => {
    try {
      if (hoverPathRef.current.join('') !== path.join('')) {
        console.log("Hover path changed, cancelling calculation for previous node");
        return;
      }

      const result = await calculateRelationFromPath(path);

      if (hoverPathRef.current.join('') !== path.join('')) {
        console.log("Hover target changed during calculation");
        return;
      }

      if (result) {
        const tamilPath = path.map(step => getTamilRelation(step));

        const resultData: HoverInfo = {
          label: result.label || getRelationLabel(node.relation, isTamil),
          englishLabel: result.english_label || node.relation,
          explanation: result.explanation ||
            (isTamil
              ? `${tamilPath.join(' → ')} உறவுமுறை`
              : `Relationship: ${path.join(' → ')}`),
          path: path,
          fromPersonName: nodes['root']?.name || 'You',
          isLoading: false,
          position: { x: clientX, y: clientY },
          nodeId: node.id
        };
        setHoverInfo(resultData);
      } else {
        const relationPath = path.length > 0
          ? path.join(' → ')
          : 'Direct relation';

        const tamilPath = path.map(step => getTamilRelation(step)).join(' → ');

        const fallbackData: HoverInfo = {
          label: getRelationLabel(node.relation, isTamil),
          englishLabel: node.relation,
          explanation: isTamil
            ? `${tamilPath} உறவுமுறை`
            : `Relationship: ${relationPath}`,
          path: path,
          fromPersonName: nodes['root']?.name || 'You',
          isLoading: false,
          position: { x: clientX, y: clientY },
          nodeId: node.id
        };
        setHoverInfo(fallbackData);
      }
    } catch (error) {
      console.error("Error in hover calculation:", error);
      if (hoverPathRef.current.join('') === path.join('')) {
        const tamilPath = path.map(step => getTamilRelation(step)).join(' → ');

        const errorData: HoverInfo = {
          label: getRelationLabel(node.relation, isTamil),
          englishLabel: node.relation,
          explanation: isTamil
            ? `${tamilPath || 'உறவுமுறை கணக்கிட முடியவில்லை'}`
            : 'Could not calculate relationship',
          path: path,
          fromPersonName: nodes['root']?.name || 'You',
          isLoading: false,
          position: { x: clientX, y: clientY },
          nodeId: node.id
        };
        setHoverInfo(errorData);
      }
    }
  }, 300);

  setHoverTimeout(timeout);
}, [calculateRelationFromPath, isTamil, nodes, activeParentId, getTamilRelation, getPathToNode, getRelationLabel]);

const handleNodeHoverLeave = useCallback(() => {
  if (hoverTimeout) {
    clearTimeout(hoverTimeout);
    setHoverTimeout(null);
  }

  hoverPathRef.current = [];
  setHoverPath([]);
  setHoverInfo(null);
  setHoverElement(null);
}, [hoverTimeout]);

const handleNodeTouchStart = useCallback((node: UniverseNode, event: React.TouchEvent) => {
  event.preventDefault();
  handleNodeHoverEnter(node, event);
}, [handleNodeHoverEnter]);

const handleNodeTouchEnd = useCallback(() => {
  handleNodeHoverLeave();
}, [handleNodeHoverLeave]);

// ============ HOVER TOOLTIP COMPONENT ============

const HoverTooltip = () => {
  if (!hoverInfo) return null;

  const tamilPath = hoverInfo.path.map(step => getTamilRelation(step));

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
    padding: '16px',
    minWidth: '280px',
    maxWidth: '320px',
    pointerEvents: 'none',
    transition: 'opacity 0.2s, transform 0.2s',
  };

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
    tooltipStyle.top = `${hoverInfo.position.y - 150}px`;
    tooltipStyle.left = `${hoverInfo.position.x}px`;
    tooltipStyle.transform = 'translateX(-50%)';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="fixed z-1000 border border-gray-300 rounded-xl shadow-2xl p-4 min-w-70max-w-[320px] pointer-events-none backdrop-blur-sm bg-white/95"
      style={tooltipStyle}
      key={hoverInfo.nodeId || 'hover-tooltip'}
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

      {hoverInfo.path.length > 0 && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-500 mb-2">
            {isTamil ? `${hoverInfo.fromPersonName} ன் பாதை:` : `Path from ${hoverInfo.fromPersonName}:`}
          </div>

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

      <div className="text-sm text-gray-700 mb-3">
        {isTamil ?
          (hoverInfo.isLoading ? 'உறவுமுறை கண்டறியப்படுகிறது...' :
            hoverInfo.explanation.includes('உறவுமுறை') ? hoverInfo.explanation :
              `${hoverInfo.explanation} உறவுமுறை`)
          : hoverInfo.explanation}
      </div>

      {hoverInfo.isLoading && (
        <div className="flex items-center gap-2 text-sm text-blue-600">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          {isTamil ? 'உறவுமுறை கணக்கிடுகிறது...' : 'Calculating relationship...'}
        </div>
      )}
    </motion.div>
  );
};

// ============ GENEALOGY METHODS ============

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
  } finally {
    setIsLoadingGenerationInfo(false);
  }
}, []);

const addToNavigationHistory = useCallback((node: UniverseNode, calcRel?: string) => {
  setNavigationHistory(prev => {
    const existingIndex = prev.findIndex(item => item.id === node.id);

    if (existingIndex !== -1) {
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

    let arrowLabel = node.arrowLabel;

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

const navigateToHistoryItem = useCallback(async (item: NavigationHistoryItem, index: number) => {
  if (index === navigationHistory.length - 1) return;

  const targetNode = nodes[item.id];

  if (targetNode) {
    console.log(`Navigating to history item: ${item.id} (${item.name}) at index ${index}`);

    setNavigationHistory(prev => prev.slice(0, index + 1));
    setActiveParentId(targetNode.id);
    setTransform({
      x: -targetNode.position.x * 0.8,
      y: -targetNode.position.y * 0.8,
      scale: 0.8
    });

    const hasChildren = Object.values(nodes).some(n => n.parentId === targetNode.id);

    if (!targetNode.isOpen || !hasChildren) {
      console.log(`Expanding node ${targetNode.id} from navigation`);

      if (targetNode.id === 'root') {
        expandNode('root', targetNode.gender);
      } else if (targetNode.relation === 'Ashramam') {
        expandAshramam(targetNode.id);
      } else if (targetNode.isConnected && targetNode.personId) {
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
          expandNode(targetNode.id, targetNode.gender);
        }
      } else if (targetNode.personId) {
        try {
          const relationsData = await genealogyService.getPersonRelations(targetNode.personId);

          setNodes(prev => {
            const nextNodes = { ...prev };
            if (nextNodes[targetNode.id]) {
              nextNodes[targetNode.id] = { ...nextNodes[targetNode.id], isOpen: true };
            }
            return nextNodes;
          });

          buildNodesFromRelations(relationsData, targetNode.gender, targetNode.id);

          if (targetNode.personId) {
            fetchGenerationInfo(targetNode.personId);
          }
        } catch (error) {
          console.error(`Error fetching relations for person ${targetNode.personId}:`, error);
          expandNode(targetNode.id, targetNode.gender);
        }
      } else {
        expandNode(targetNode.id, targetNode.gender);
      }
    } else {
      console.log(`Node ${targetNode.id} already has children, just updating view`);

      if (targetNode.personId && targetNode.id !== 'root') {
        fetchGenerationInfo(targetNode.personId);
      }
    }

    toast.success(`Navigated to ${targetNode.name} (Generation ${targetNode.level})`);
  } else {
    console.error(`Target node ${item.id} not found in current nodes`);

    if (item.personId) {
      try {
        toast.loading(`Loading ${item.name}...`, { id: 'nav-loading' });

        const personData = await genealogyService.getPersonDetails(item.personId);

        if (personData) {
          const newNode: UniverseNode = {
            id: `nav-${personData.id}`,
            name: personData.full_name.toUpperCase(),
            relation: item.relation,
            level: item.level,
            parentId: null,
            position: { x: 0, y: 0 },
            isOpen: true,
            gender: personData.gender,
            personId: personData.id,
            isUpdated: true
          };

          const relationsData = await genealogyService.getPersonRelations(personData.id);

          setNodes({
            [newNode.id]: newNode
          });

          buildNodesFromRelations(relationsData, personData.gender, newNode.id);
          setActiveParentId(newNode.id);
          setTransform({ x: 0, y: 0, scale: 0.8 });

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

const getFilteredRelations = useCallback((parentGender?: string) => {
  const rawGender = parentGender || (profile.gender || currentPerson?.gender || 'M');

  let genderToTest = 'M';
  if (typeof rawGender === 'string') {
    const g = rawGender.trim().toUpperCase();
    if (g.startsWith('F')) genderToTest = 'F';
    else if (g.startsWith('M')) genderToTest = 'M';
  }

  const filtered = ALL_RELATIONS.filter(rel => {
    if (genderToTest === 'M' && rel === 'Husband') return false;
    if (genderToTest === 'F' && rel === 'Wife') return false;
    return true;
  });

  return filtered;
}, [currentPerson?.gender, profile.gender]);

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
          name: rel,
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
          isConnected: false
        };

        console.log(`Created default node: ${childId} - ${rel}`);
      }
    });

    return nextNodes;
  });
}, [getFilteredRelations, isTamil]);

const fetchPersonDetails = useCallback(async (personId: number) => {
  try {
    setIsLoadingPerson(true);
    console.log(`Fetching person details for ID: ${personId}`);

    const personData = await genealogyService.getPersonDetails(personId);
    console.log("Person details:", personData);

    setCurrentPerson(personData);

    setNodes(prev => ({
      ...prev,
      'root': {
        ...prev['root'],
        name: personData.full_name.toUpperCase() || 'YOU',
        gender: personData.gender || 'M',
        personId: personData.id,
        isUpdated: true,
        image: getFullImageUrl(personData.image)
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

const fetchExistingRelations = useCallback(async (personId: number) => {
  if (!personId || isLoadingRelations) return;

  try {
    setIsLoadingRelations(true);
    console.log("Fetching existing relations for person:", personId);
    const relationsData = await genealogyService.getPersonRelations(personId);
    console.log("Existing relations data:", relationsData);

    buildNodesFromRelations(relationsData);
  } catch (error) {
    console.error("Error fetching existing relations:", error);
  } finally {
    setIsLoadingRelations(false);
  }
}, [isLoadingRelations]);

const buildNodesFromRelations = useCallback((relationsData: PersonRelationsResponse, overrideGender?: string, sourceNodeId: string = 'root') => {
  console.log(`Building nodes for ${sourceNodeId} from API relations + merging placeholders`);

  setNodes(prev => {
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

    const groupedApi: { [key: string]: typeof allApi } = {};
    allApi.forEach(rel => {
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

          const matchId = `${match.from_person}-${match.to_person}-${match.relation_code}`;
          usedApiIds.add(matchId);

          const isConnected = !!(match as any).to_person_info?.linked_user ||
            !!(match as any).from_person_info?.linked_user ||
            (match as any).is_connected ||
            (match as any).status === 'confirmed' ||
            (match as any).linked_user !== null;

          const imageUrl = (String(personId) === String((match as any).from_person))
            ? (match as any).from_person_profile_picture
            : (match as any).to_person_profile_picture;

          nodesToCreate.push({
            name: (personName || '').toUpperCase(),
            relation: relType,
            relationLabel: relationLabel,
            arrowLabel: (match as any).arrow_label || (match as any).relation_label?.arrow_label,
            gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M',
            personId: personId,
            isUpdated: true,
            isConnected: isConnected,
            isReadOnly: relationsData.permissions?.is_readonly,
            image: imageUrl ? getFullImageUrl(imageUrl) : null
          });
        });
      } else {
        const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M';
        nodesToCreate.push({
          name: relType,
          relation: relType,
          relationLabel: getRelationLabel(relType, isTamil),
          gender: childGender,
          isUpdated: false,
          isConnected: false,
          isReadOnly: relationsData.permissions?.is_readonly
        });
      }
    });

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

        const isConnected = !!(rel as any).to_person_info?.linked_user ||
          !!(rel as any).from_person_info?.linked_user ||
          (rel as any).is_connected ||
          (rel as any).status === 'confirmed' ||
          (rel as any).linked_user !== null;

        const personId = isOutgoing ? rel.to_person : rel.from_person;
        const personName = isOutgoing ? rel.to_person_name : rel.from_person_name;

        const imageUrl = (String(personId) === String((rel as any).from_person))
          ? (rel as any).from_person_profile_picture
          : (rel as any).to_person_profile_picture;

        nodesToCreate.push({
          name: personName.toUpperCase(),
          relation: uiRel,
          relationLabel: relationLabel,
          arrowLabel: (rel as any).arrow_label || (rel as any).relation_label?.arrow_label,
          gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(uiRel) ? 'F' : 'M',
          personId: personId,
          isUpdated: true,
          isConnected: isConnected,
          isReadOnly: relationsData.permissions?.is_readonly,
          image: imageUrl ? getFullImageUrl(imageUrl) : null
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

    console.log(`Finished building ${count} nodes for ${sourceNodeId}`);

    const existingSource = cleanedNodes[sourceNodeId] || prev[sourceNodeId];
    if (existingSource) {
      cleanedNodes[sourceNodeId] = {
        ...existingSource,
        isOpen: true,
        isConnected: relationsData.permissions?.is_connected ?? existingSource.isConnected,
        isReadOnly: relationsData.permissions?.is_readonly ?? existingSource.isReadOnly
      };
    }

    return cleanedNodes;
  });
}, [getFilteredRelations, isTamil, profile.gender]);

const buildNodesFromRelationsForNextFlow = useCallback((data: any, overrideGender?: string, sourceNodeId: string = 'root') => {
  console.log(`Building nodes for ${sourceNodeId} from NEXT_FLOW API relations + merging placeholders`);

  setNodes(prev => {
    const cleanedNodes: { [key: string]: UniverseNode } = {};
    Object.entries(prev).forEach(([id, node]) => {
      if (node.parentId !== sourceNodeId || id === sourceNodeId) {
        cleanedNodes[id] = node;
      }
    });

    const sourceNode = cleanedNodes[sourceNodeId];
    if (!sourceNode) return prev;

    const currentGender = overrideGender || sourceNode.gender || 'M';
    const baseRelations = getFilteredRelations(currentGender);

    const relationsData = data.existing_relations || data;
    const permissions = data.permissions || (data.existing_relations?.permissions);

    const apiOutgoing = relationsData.outgoing || [];
    const apiIncoming = relationsData.incoming || [];
    const allApi: any[] = Array.isArray(relationsData) ? relationsData : [...(relationsData.outgoing || []), ...(relationsData.incoming || [])];

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

          const isConnected = !!(match as any).person?.linked_user ||
            !!(match as any).to_person_info?.linked_user ||
            !!(match as any).from_person_info?.linked_user ||
            (match as any).is_connected ||
            (match as any).status === 'confirmed' ||
            (match as any).linked_user !== null;

          const imageUrl = (personId && String(personId) === String((match as any).from_person))
            ? (match as any).from_person_profile_picture
            : (match as any).to_person_profile_picture;

          nodesToCreate.push({
            name: (personName || '').toUpperCase(),
            relation: relType,
            relationLabel: relationLabel,
            arrowLabel: (match as any).arrow_label || (match as any).relation_label?.arrow_label,
            gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M',
            personId: personId,
            isUpdated: true,
            isConnected: isConnected,
            isReadOnly: permissions?.is_readonly,
            image: imageUrl ? getFullImageUrl(imageUrl) : null
          });
        });
      } else {
        const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M';
        nodesToCreate.push({
          name: relType,
          relation: relType,
          relationLabel: getRelationLabel(relType, isTamil),
          gender: childGender,
          isUpdated: false,
          isConnected: false,
          isReadOnly: permissions?.is_readonly
        });
      }
    });

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

        const isConnected = !!(rel as any).person?.linked_user ||
          !!(rel as any).to_person_info?.linked_user ||
          !!(rel as any).from_person_info?.linked_user ||
          (rel as any).is_connected ||
          (rel as any).status === 'confirmed' ||
          (rel as any).linked_user !== null;

        const personId = isNextFlowItem ? (rel as any).person_id : (String(rel.from_person) === String(sourceNode.personId) ? rel.to_person : rel.from_person);
        const personName = isNextFlowItem ? (rel as any).name : (String(rel.from_person) === String(sourceNode.personId) ? rel.to_person_name : rel.from_person_name);

        const imageUrl = (personId && String(personId) === String((rel as any).from_person))
          ? (rel as any).from_person_profile_picture
          : (rel as any).to_person_profile_picture;

        nodesToCreate.push({
          name: (personName || '').toUpperCase(),
          relation: uiRel,
          relationLabel: relationLabel,
          arrowLabel: (rel as any).arrow_label || (rel as any).relation_label?.arrow_label,
          gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(uiRel) ? 'F' : 'M',
          personId: personId,
          isUpdated: true,
          isConnected: isConnected,
          isReadOnly: permissions?.is_readonly,
          image: imageUrl ? getFullImageUrl(imageUrl) : null
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

      nextNodes[nodeId] = { ...node, isOpen: true };

      const baseRelations = getFilteredRelations(nodeGender);
      const apiOutgoing = relationsData.outgoing || [];
      const apiIncoming = relationsData.incoming || [];
      const allApi = [...apiOutgoing, ...apiIncoming];

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

            const isConnected = !!(match as any).person?.linked_user ||
              !!(match as any).to_person_info?.linked_user ||
              !!(match as any).from_person_info?.linked_user ||
              (match as any).is_connected ||
              (match as any).status === 'confirmed' ||
              (match as any).linked_user !== null;

            const imageUrl = (relatedPersonId && String(relatedPersonId) === String((match as any).from_person))
              ? (match as any).from_person_profile_picture
              : (match as any).to_person_profile_picture;

            nodesToCreate.push({
              name: (relatedPersonName || '').toUpperCase(),
              relation: relType,
              relationLabel: relationLabel,
              arrowLabel: (match as any).arrow_label || (match as any).relation_label?.arrow_label,
              gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M',
              personId: relatedPersonId,
              isUpdated: true,
              isConnected: isConnected,
              image: imageUrl ? getFullImageUrl(imageUrl) : null
            });
          });
        } else {
          const childGender = ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(relType) ? 'F' : 'M';
          nodesToCreate.push({
            name: nodeId === 'root' ? relType : `${relType} of ${node.name}`,
            relation: relType,
            relationLabel: getRelationLabel(relType, isTamil),
            gender: childGender,
            personId: Math.floor(Math.random() * 1000) + 5000,
            isUpdated: false,
            isConnected: false
          });
        }
      });

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

          const isConnected = !!(rel as any).person?.linked_user ||
            !!(rel as any).to_person_info?.linked_user ||
            !!(rel as any).from_person_info?.linked_user ||
            (rel as any).is_connected ||
            (rel as any).status === 'confirmed' ||
            (rel as any).linked_user !== null;

          const imageUrl = (rPersonId && String(rPersonId) === String((rel as any).from_person))
            ? (rel as any).from_person_profile_picture
            : (rel as any).to_person_profile_picture;

          nodesToCreate.push({
            name: (rPersonName || '').toUpperCase(),
            relation: uiRel,
            relationLabel: relationLabel,
            arrowLabel: (rel as any).arrow_label || (rel as any).relation_label?.arrow_label,
            gender: ['Mother', 'Wife', 'Elder Sister', 'Younger Sister', 'Daughter'].includes(uiRel) ? 'F' : 'M',
            personId: rPersonId,
            isUpdated: true,
            isConnected: isConnected,
            image: imageUrl ? getFullImageUrl(imageUrl) : null
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

const refreshFamilyTree = useCallback(async () => {
  if (!currentPerson?.id) return;

  try {
    console.log("Refreshing family tree data...");
    const relationsData = await genealogyService.getPersonRelations(currentPerson.id);
    buildNodesFromRelations(relationsData, currentPerson.gender);
    fetchGenerationInfo(currentPerson.id);
    await checkForAcceptedInvitations();
  } catch (error) {
    console.error("Error refreshing family tree:", error);
  }
}, [currentPerson?.id, currentPerson?.gender, buildNodesFromRelations, fetchGenerationInfo]);

const checkForAcceptedInvitations = useCallback(async () => {
  if (!currentPerson?.id) return;

  try {
    console.log("Checking for accepted invitations...");

    for (const invitation of activeInvitations) {
      try {
        const personDetails = await genealogyService.getPersonDetails(invitation.personId);

        if (personDetails && personDetails.is_alive) {
          console.log(`Person ${personDetails.full_name} has accepted invitation as ${invitation.relation}`);

          const invitationRelation = invitation.relation.toLowerCase();

          if (invitationRelation.includes('son') || invitationRelation.includes('daughter')) {
            console.log("Detected child relation invitation. Verifying father linkage...");

            try {
              const personRelations = await genealogyService.getPersonRelations(invitation.personId);

              const hasFather = personRelations.outgoing?.some(rel =>
                rel.relation_code === 'FATHER'
              ) || personRelations.incoming?.some(rel =>
                rel.relation_code === 'FATHER'
              );

              if (!hasFather) {
                console.warn(`${personDetails.full_name} may not be linked to correct father. Placeholder issue detected.`);

                const relationWords = invitation.relation.split(' ');
                if (relationWords.length >= 2) {
                  const possibleFatherName = relationWords[0];
                  console.log(`Possible father name from placeholder: ${possibleFatherName}`);

                  toast(`${personDetails.full_name} may need manual father linking. ` +
                    `Expected father: ${possibleFatherName}`, { icon: '⚠️' }
                  );
                }
              }
            } catch (relationError) {
              console.error("Error verifying father linkage:", relationError);
            }
          }

          setActiveInvitations(prev =>
            prev.filter(inv => inv.personId !== invitation.personId)
          );

          let message = `${personDetails.full_name} has accepted your invitation!`;

          if (invitation.fatherName) {
            message += ` Should be linked to father: ${invitation.fatherName}`;
          } else if ((personDetails as any).father_name) {
            message += ` Linked to father: ${(personDetails as any).father_name}`;
          }

          toast.success(message);
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

const startCheckingForAcceptance = useCallback((
  personId: number,
  personName: string,
  relation: string,
  phoneNumber: string,
  fatherName?: string
) => {
  console.log(`Starting to check for acceptance of invitation for ${personName} as ${relation}`);

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

  let message = `Invitation sent to ${personName}.`;

  if (fatherName && (relation.toLowerCase().includes('son') || relation.toLowerCase().includes('daughter'))) {
    message += ` They will be linked as ${relation.toLowerCase()} of ${fatherName}.`;
  } else if (fatherName) {
    message += ` Parent: ${fatherName}`;
  }

  message += ` We'll notify you when they accept.`;

  toast.success(message);
}, []);

useEffect(() => {
  if (currentPerson?.id) {
    fetchGenerationInfo(currentPerson.id);
  }
}, [currentPerson?.id, fetchGenerationInfo]);

useEffect(() => {
  const fetchAllData = async () => {
    try {
      const profileData = await authService.getMyProfile();
      setProfile({
        ...profileData,
        image: getFullImageUrl(profileData.image as string)
      });
      console.log("1. Profile data fetched:", profileData);

      let personMe: any = null;
      const targetPersonId = (location.state as any)?.personId;

      if (targetPersonId) {
        try {
          console.log("Loading target person from navigation state, ID:", targetPersonId);
          personMe = await genealogyService.getPersonDetails(targetPersonId);
          if (personMe) {
            setCurrentPerson(personMe);
            console.log("Target person details loaded:", personMe);
          }
        } catch (e) {
          console.error("Error fetching target person details:", e);
        }
      }

      if (!personMe) {
        try {
          personMe = await genealogyService.getPersonMe();
          if (personMe) {
            setCurrentPerson(personMe);
            console.log("2. Person Me data fetched:", personMe);
          }
        } catch (e) {
          console.error("Error fetching genealogy 'me' person:", e);
        }
      }

      const personIdToUse = personMe?.id || profileData.id;
      const personName = String(personMe?.full_name || profileData.firstname || 'YOU');
      const personGender = profileData.gender || personMe?.gender || 'M';
      const isFromAPI = !!personMe;

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
        const relationsData = await genealogyService.getPersonRelations(personIdToUse);
        buildNodesFromRelations(relationsData, personGender);
      }

      setTimeout(() => {
        if (nodes['root']) {
          setTransform({
            x: -nodes['root'].position.x * 0.3,
            y: -nodes['root'].position.y * 0.3,
            scale: 0.3
          });
        }

        expandNode('root', personGender);
        hasAutoExpanded.current = true;
      }, 800);

    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error(t('error'));
    }
  };

  fetchAllData();

  refreshIntervalRef.current = setInterval(refreshFamilyTree, 30000);

  const initialCheck = setTimeout(checkForAcceptedInvitations, 10000);

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

const expandNode = useCallback((nodeId: string, overrideGender?: string, isNextFlow: boolean = false) => {
  setActiveParentId(nodeId);

  setNodes(prev => {
    const node = prev[nodeId];
    if (!node || node.isOpen) return prev;

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

const expandAshramam = useCallback((nodeId: string, customExtraRelations?: any[], customStandardOptions?: any[]) => {
  console.log("expandAshramam called with:", {
    nodeId,
    customExtraRelations: customExtraRelations?.length,
    customStandardOptions: customStandardOptions?.length
  });
  
  setNodes(prev => {
    const node = prev[nodeId];
    if (!node || node.relation !== 'Ashramam') return prev;

    setActiveParentId(nodeId);

    // Remove all existing children of this Ashramam node
    const nextNodes: { [key: string]: UniverseNode } = {};
    Object.entries(prev).forEach(([id, n]) => {
      if (n.parentId !== nodeId) {
        nextNodes[id] = n;
      }
    });
    nextNodes[nodeId] = { ...node, isOpen: true };

    // Use provided data or fallback to state
    const extraRelationsData = customExtraRelations || ashramamExtraRelations;
    const standardOptionsData = customStandardOptions || ashramamStandardOptions;
    
    console.log("Using data:", {
      extraCount: extraRelationsData.length,
      standardCount: standardOptionsData.length
    });
    
    // ============ Calculate total count ============
    // Only add standard options if they exist
    const hasStandardOptions = standardOptionsData && standardOptionsData.length > 0;
    const extraCount = extraRelationsData.length;
    const totalCount = extraCount + (hasStandardOptions ? standardOptionsData.length : 0) + 1; // +1 for ADD button
    
    const baseAshramamRadius = RADIUS_BASE * 0.75;
    const radius = totalCount > 20 ? baseAshramamRadius * (1 + (totalCount - 20) * 0.05) : baseAshramamRadius;
    
    let currentIndex = 0;
    
    // ============ Add standard options first (if any) ============
    if (hasStandardOptions) {
      console.log(`Adding ${standardOptionsData.length} standard options from API`);
      for (let i = 0; i < standardOptionsData.length; i++) {
        const option = standardOptionsData[i];
        const angle = (currentIndex * (360 / totalCount)) * (Math.PI / 180);
        const childId = `${nodeId}-standard-${i}`;
        const relationName = option.label || option.code;
        const gender = option.gender || 'M';
        
        nextNodes[childId] = {
          id: childId,
          name: (relationName || '').toUpperCase(),
          relation: 'Ashramam Member',
          relationLabel: relationName,
          arrowLabel: relationName,
          level: node.level + 1,
          parentId: nodeId,
          position: {
            x: node.position.x + Math.cos(angle) * radius,
            y: node.position.y + Math.sin(angle) * radius
          },
          isOpen: false,
          gender: gender,
          isUpdated: false,
          isConnected: false
        };
        currentIndex++;
      }
    }
    
    // ============ Add existing relations (extra relations) ============
    if (extraRelationsData.length > 0) {
      console.log(`Adding ${extraRelationsData.length} existing relations`);
      extraRelationsData.forEach((extra, idx) => {
        const angle = (currentIndex * (360 / totalCount)) * (Math.PI / 180);
        const childId = `${nodeId}-extra-${idx}`;
        
        // Get display label
        let displayLabel = extra.relation || extra.relation_label || extra.label || '';
        
        console.log(`Creating node for ${extra.name} with label:`, displayLabel);
        
        nextNodes[childId] = {
          id: childId,
          name: (extra.name || extra.full_name || '').toUpperCase(),
          relation: 'Ashramam Member',
          relationLabel: displayLabel,
          arrowLabel: displayLabel,
          level: node.level + 1,
          parentId: nodeId,
          position: {
            x: node.position.x + Math.cos(angle) * radius,
            y: node.position.y + Math.sin(angle) * radius
          },
          isOpen: false,
          gender: extra.gender || 'M',
          personId: extra.id,
          isUpdated: true,
          isConnected: false
        };
        currentIndex++;
      });
    }
    
    // ============ Add ADD+ button (always at the end) ============
    const angle = (currentIndex * (360 / totalCount)) * (Math.PI / 180);
    const addNodeId = `${nodeId}-add-button`;
    
    nextNodes[addNodeId] = {
      id: addNodeId,
      name: 'ADD +',
      relation: 'Ashramam Add',
      relationLabel: isTamil ? 'சேர்க்க+' : 'Add+',
      arrowLabel: isTamil ? 'சேர்க்க+' : 'Add+',
      level: node.level + 1,
      parentId: nodeId,
      position: {
        x: node.position.x + Math.cos(angle) * radius,
        y: node.position.y + Math.sin(angle) * radius
      },
      isOpen: false,
      gender: 'M',
      isUpdated: false,
      isConnected: false
    };
    
    console.log(`Total nodes created: ${currentIndex + 1} (${currentIndex} members + ADD button)`);
    
    return nextNodes;
  });
}, [isTamil, ashramamStandardOptions, ashramamExtraRelations]);

useEffect(() => {
  const ashramamNodeId = Object.keys(nodes).find(id => nodes[id].relation === 'Ashramam' && nodes[id].isOpen);
  if (ashramamNodeId) {
    expandAshramam(ashramamNodeId);
  }
}, [ashramamExtraRelations, expandAshramam]);

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

useEffect(() => {
  const searchMobileNumber = async () => {
    if (phoneNumber.length >= 3) {
      setIsSearchingMobile(true);
      try {
        const response = await api.get(`/api/auth/api/mobile-search/`, {
          params: { q: phoneNumber }
        });

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

useEffect(() => {
  const searchMain = async () => {
    if (searchMobile.trim().length >= 3) {
      try {
        const response = await genealogyService.searchPersons(searchMobile);
        if (response.success && response.suggestions && response.suggestions.length > 0) {
          setSearchSuggestions(response.suggestions);
        } else {
          setSearchSuggestions([{
            id: -1,
            full_name: isTamil ? 'பயனர் யாரும் இல்லை' : 'No user found',
            mobile_number: '',
            relation_label: ''
          }]);
        }
      } catch (error) {
        console.error("Error searching persons:", error);
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

  const timer = setTimeout(searchMain, 300);
  return () => clearTimeout(timer);
}, [searchMobile, isTamil]);

const handleSuggestionClick = async (suggestion: any) => {
  if (suggestion.id === -1) {
    return;
  }

  setSearchMobile('');
  setSearchSuggestions([]);

  try {
    setIsSearching(true);
    toast.loading(isTamil ? `${suggestion.full_name} தேடுகிறது...` : `Loading ${suggestion.full_name}...`, { id: 'search-nav' });

    const personData = await genealogyService.getPersonDetails(suggestion.id);

    if (personData) {
      toast.success(isTamil ? `${personData.full_name} கண்டறியப்பட்டார்` : `Found: ${personData.full_name}`, { id: 'search-nav' });

      const newNode: UniverseNode = {
        id: 'root',
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

      const relationsData = await genealogyService.getPersonRelations(personData.id);

      setNodes({
        'root': newNode
      });

      buildNodesFromRelations(relationsData, personData.gender, 'root');
      setActiveParentId('root');

      setTransform({ x: 0, y: 0, scale: 0.8 });

      setNavigationHistory(prev => {
        return [...prev, {
          id: 'root',
          name: newNode.name,
          relation: 'Search Result',
          personId: newNode.personId,
          level: 0,
          timestamp: Date.now()
        }];
      });

      fetchGenerationInfo(personData.id);
    }
  } catch (error) {
    console.error("Navigation error:", error);
    toast.error(isTamil ? 'நபரை ஏற்ற முடியவில்லை' : 'Failed to load person', { id: 'search-nav' });
  } finally {
    setIsSearching(false);
  }
};

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

    const response = await api.get(`/api/auth/api/mobile-search/`, {
      params: { q: cleanedPhone }
    });

    const results = response.data?.results || [];

    if (results && results.length > 0) {
      const targetUser = results[0];

      toast.loading(isTamil ? 'பயனர் தகவலை ஏற்றுகிறது...' : 'Loading user information...', { id: 'search-loading' });

      try {
        const personData = await genealogyService.getPersonDetails(targetUser.id);

        if (personData) {
          toast.success(isTamil ? `${personData.full_name} கண்டறியப்பட்டார்` : `Found: ${personData.full_name}`, { id: 'search-loading' });

          const newNode: UniverseNode = {
            id: `search-${personData.id}`,
            name: personData.full_name.toUpperCase(),
            relation: 'Search Result',
            level: 0,
            parentId: null,
            position: { x: 0, y: 0 },
            isOpen: true,
            personId: personData.id,
            isUpdated: true,
            gender: personData.gender,
            image: personData.image
          };

          const relationsData = await genealogyService.getPersonRelations(personData.id);

          setNodes({
            [newNode.id]: newNode
          });

          buildNodesFromRelations(relationsData, personData.gender, newNode.id);
          setActiveParentId(newNode.id);

          setTransform({ x: 0, y: 0, scale: 0.8 });

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

/**
 * Resolves the effective parent personId for API calls.
 * Walks up the node tree until it finds a node with a personId.
 * Handles cases where the immediate parent (e.g. Ashramam node) has no personId.
 */
const resolveParentPersonId = useCallback((selectedNodeId: string): number | undefined => {
  let currentId = nodes[selectedNodeId]?.parentId;
  while (currentId) {
    const n = nodes[currentId];
    if (!n) break;
    if (n.personId) return n.personId;
    currentId = n.parentId || null;
  }
  // Fallback to currentPerson or root
  return currentPerson?.id || nodes['root']?.personId || (profile as any).id;
}, [nodes, currentPerson, profile]);

const handleAshramamClick = async (node: UniverseNode) => {
  console.log("🔵 Ashramam clicked:", node);

  let targetId = node.personId;
  if (!targetId && node.parentId) {
    const parent = nodes[node.parentId];
    if (parent) {
      targetId = parent.personId;
      console.log("📍 Using parent's personId for Ashramam:", targetId);
    }
  }

  if (targetId) {
    try {
      console.log(`🚀 Fetching Ashramam relations for ID: ${targetId}`);
      const data = await genealogyService.getAshramamRelations(targetId);
      console.log("📥 API Data received:", data);

      if (data) {
        // ============ Process standard options from add_options ============
        let standardOps = [];
        if (data.add_options && data.add_options.standard_ashramam) {
          standardOps = data.add_options.standard_ashramam;
          console.log("Standard options from API:", standardOps.length, "items");
        }
        
        // ============ Process existing relations ============
        let mappedExtra: { id: number; name: string; relation: string; relation_code: string; gender: string }[] = [];
        if (data.ashramam_relations) {
          const myRelatives = data.ashramam_relations.my_relatives || [];
          const iAmRelativeTo = data.ashramam_relations.i_am_relative_to || [];

          // Map existing relations
          mappedExtra = [...myRelatives, ...iAmRelativeTo].map((rel: any) => {
            // Get the display label
            let displayLabel = '';
            
            if (rel.relation) {
              if (typeof rel.relation === 'object') {
                // For existing relations, use primary_label or label
                displayLabel = rel.relation.primary_label || 
                               rel.relation.label || 
                               rel.relation.stored_code;
              } else {
                displayLabel = rel.relation;
              }
            } else if (rel.relation_label) {
              if (typeof rel.relation_label === 'object') {
                displayLabel = rel.relation_label.label || 
                               rel.relation_label.primary_label;
              } else {
                displayLabel = rel.relation_label;
              }
            }
            
            // Clean up the label if it contains hyphen
            if (displayLabel && displayLabel.includes('-')) {
              const parts = displayLabel.split('-');
              // For existing relations with direction, use appropriate part
              if (rel.relation?.direction === 'incoming') {
                displayLabel = rel.relation?.primary_label || parts[0];
              } else {
                displayLabel = rel.relation?.inverse_label || parts[1] || parts[0];
              }
            }
            
            console.log(`Mapping existing member ${rel.person?.full_name} with label:`, displayLabel);
            
            return {
              id: rel.person?.id || rel.id,
              name: rel.person?.full_name || rel.person?.name || rel.full_name || rel.name || '',
              relation: displayLabel,
              relation_code: rel.relation?.stored_code || rel.relation?.code || rel.relation_code,
              gender: rel.person?.gender || rel.gender || 'M'
            };
          });
        }
        
        console.log("✨ Mapped extra relations:", mappedExtra.length);
        console.log("✨ Standard options:", standardOps.length);
        
        // ============ CRITICAL: Update state FIRST ============
        setAshramamExtraRelations(mappedExtra);
        setAshramamStandardOptions(standardOps);
        
        // ============ Then expand with the data ============
        // Small delay to ensure state is updated
        setTimeout(() => {
          expandAshramam(node.id, mappedExtra, standardOps);
        }, 50);
        
        return;
      }
    } catch (e) {
      console.error("❌ Error fetching ashramam relations:", e);
      // Fallback: expand with current state
      expandAshramam(node.id);
    }
  } else {
    console.warn("⚠️ No personId found for Ashramam node or its parent");
    expandAshramam(node.id);
  }
};

// ============ UPDATED NODE CLICK HANDLER - FINAL FIX ============
const handleNodeClick = (node: UniverseNode) => {
  console.log("Node Clicked:", { id: node.id, name: node.name, relation: node.relation, personId: node.personId });
  handleNodeHoverLeave();
  setInvitationError(null);
  setSelectedNodeCalculatedRelation(null);

  const isRoot = node.id === 'root';
  const isAshramam = node.relation === 'Ashramam';
  const isAshramamAdd = node.relation === 'Ashramam Add';

  // Check if this node is in the path
  const isInPath = node.personId && pathNodeIds.has(node.personId);

  // Check if this is the blinking node (my father)
  const isBlinkingNode = (blinkingNodeId && node.id === blinkingNodeId) ||
    (blinkingPersonId && node.personId && Number(node.personId) === Number(blinkingPersonId));

  // 🛑 CRITICAL: Check if this is the LAST NODE in the path (vasanth - GRANDSON)
  // Directly from pathNodes array - this is 100% reliable
  const lastNodeInPath = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : null;
  const isLastNode = lastNodeInPath &&
    node.personId &&
    Number(node.personId) === Number(lastNodeInPath?.person_id);

  console.log("Node check:", {
    isInPath,
    isBlinkingNode,
    isLastNode,
    personId: node.personId,
    lastNodeId: lastNodeInPath?.person_id,
    pathNodesLength: pathNodes.length
  });

  // Allow click if in path or normal navigation rules
  const isHighlighted = isRoot || isAshramam || isAshramamAdd || isInPath ||
    node.id === activeParentId ||
    (activeParentId && node.id.startsWith(activeParentId + '-')) ||
    node.parentId === activeParentId ||
    (!activeParentId && node.parentId === 'root') ||
    (activeParentId && nodes[activeParentId]?.parentId === node.id);

  if (!isHighlighted) {
    console.log("Ignoring click on non-path node:", node.id);
    return;
  }

  // 🛑 CRITICAL: If this is the LAST NODE - show path info modal ONLY
  if (isLastNode) {
    console.log("🎯 LAST NODE clicked - showing path info ONLY");
    setSelectedNode(node);
    setShowPathInfoModal(true);
    return; // ✅ MUST return - NO modal with buttons
  }

  // If this is the blinking node (my father) - show only Next Flower
  if (isBlinkingNode) {
    console.log("Blinking node clicked - showing limited modal");
    setSelectedNode(node);
    setShowModal(true);
    return;
  }

  // For other nodes in the path, allow normal navigation
  const getRelationAndAddHistory = async () => {
    const path = getPathToNode(node);
    const calcRelResult = await calculateRelationFromPath(path);
    setSelectedNodeCalculatedRelation(calcRelResult);
    addToNavigationHistory(node, calcRelResult?.label);
  };

  getRelationAndAddHistory();

  const targetScale = 0.8;
  setTransform({
    x: -node.position.x * targetScale,
    y: -node.position.y * targetScale,
    scale: targetScale
  });

  if (node.isReadOnly) return;

  if (node.isConnected && node.id !== 'root') {
    setSelectedNode(node);
    setShowModal(true);
    return;
  }

  if (node.id === 'root') {
    expandNode('root');
  } else if (node.relation === 'Ashramam') {
    handleAshramamClick(node);
  } else if (node.relation === 'Ashramam Add') {
    setSelectedNode(node);
    setShowAddAshramamModal(true);
  } else {
    setSelectedNode(node);
    setShowModal(true);
  }
};


const handleNameEditClick = () => {
  if (selectedNode) {
    if (selectedNode.isUpdated) {
      setEditingName(selectedNode.name);
    } else {
      setEditingName('');
    }
    setShowNameEditModal(true);
  }
};

const handleSaveName = async () => {
  console.log("=== FUNCTION CALLED: handleSaveName ===");
  if (!selectedNode || !editingName.trim()) return;

  setIsSavingName(true);

  try {
    console.log("1. Starting save name process...");
    console.log("2. Selected Node:", selectedNode);
    console.log("3. Editing Name:", editingName);

    const relationToMe = mapRelationToAPI(selectedNode.relation);
    console.log("4. Mapped Relation:", selectedNode.relation, "→", relationToMe);

    // --- If the node already has a real person (isUpdated), just update the name ---
    if (selectedNode.personId && selectedNode.isUpdated) {
      console.log("Updating existing person name...");
      try {
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
      } catch (updateError: any) {
        console.error("Error updating name:", updateError);
        toast.error(updateError.response?.data?.message || 'Failed to update name');
        return;
      }
    }

    // --- For new (placeholder) nodes: always call add_relative_action on the parent ---
    // Walk up the node tree to find the nearest ancestor with a real personId
    const parentNodeId = selectedNode.parentId;
    const parentPersonId = resolveParentPersonId(selectedNode.id);

    console.log("Resolved parent personId for add_relative_action:", parentPersonId, "(parentNodeId:", parentNodeId, ")");

    if (!parentPersonId) {
      toast.error('Cannot find parent person. Please try again.');
      return;
    }

    // Build action string from relation
    let action = `add_${relationToMe.toLowerCase()}`;

    if (selectedNode.relation === 'Ashramam Member' && selectedNode.relationLabel) {
      const tamilToEnglishMap: { [key: string]: string } = {
        'அண்ணன்': 'anna',
        'அக்கா': 'akka',
        'தம்பி': 'thambi',
        'தங்கை': 'thangai',
        'அப்பா': 'father',
        'அம்மா': 'mother',
        'மகன்': 'magan',
        'மகள்': 'maghazh',
        'மருமகன்': 'marumagan',
        'மருமகள்': 'marumagal',
        'தாத்தா': 'thatha',
        'பாட்டி': 'paati',
        'கணவன்': 'husband',
        'மனைவி': 'wife',
        'சித்தி': 'chithi',
        'அத்தை': 'athai',
        'மாமா': 'mama',
        'சித்தப்பா': 'chithappa',
        'பெரியப்பா': 'periyappa',
        'பெரியம்மா': 'periyamma',
        'மைத்துனர்': 'maithunar',
        'அத்தான்': 'athan',
        'அண்ணி': 'anni',
        'கொழுந்தனார்': 'kolunthanar',
        'கொழுந்தியாள்': 'kolunthiyazh',
        'பேரன்': 'peran',
        'பேத்தி': 'petthi'
      };
      const relationName = selectedNode.relationLabel.toLowerCase();
      const englishRelation = tamilToEnglishMap[relationName] || relationName;
      action = `add_${englishRelation}`;
    }

    const actionPayload: AddRelativeActionPayload = {
      action: action,
      full_name: editingName.trim()
    };

    console.log(`Calling addRelativeAction for person ${parentPersonId} with payload:`, actionPayload);
    const response = await genealogyService.addRelativeAction(parentPersonId, actionPayload);

    if (response && response.success !== false) {
      toast.success(response.message || 'Added successfully');

      const newPersonData = (response as any).new_person || (response as any).person;

      if (newPersonData) {
        const savedPersonId = newPersonData.id;
        const savedPersonName = newPersonData.name || newPersonData.full_name;

        // Update only the clicked node with the saved information - NO GENERATION CHANGE
        setNodes(prev => ({
          ...prev,
          [selectedNode.id]: {
            ...prev[selectedNode.id],
            name: savedPersonName.toUpperCase(),
            personId: savedPersonId,
            isUpdated: true,
            // Keep ALL existing properties - level, position, parentId remain the same
            level: prev[selectedNode.id].level, // Explicitly keep the same level
            position: prev[selectedNode.id].position // Keep the same position
          }
        }));

        // Update selected node reference
        setSelectedNode(prev => prev ? {
          ...prev,
          personId: savedPersonId,
          name: savedPersonName.toUpperCase(),
          isUpdated: true,
          level: prev.level // Keep the same level
        } : null);

        // DO NOT refresh the tree for this node - this would cause generation change
        // Instead, we'll just update the parent's relations to show this node as updated
        // But without changing the view or navigating to next generation

        // Optional: Refresh only the parent's relations to show this node correctly
        // But don't change the current view
        if (parentNodeId && nodes[parentNodeId]?.personId) {
          try {
            // Silently refresh in background without affecting UI
            const parentNode = nodes[parentNodeId];
            if (parentNode?.personId) {
              const relationsData = await genealogyService.getPersonRelations(parentNode.personId);
              // Update without changing the current node's position or level
              setNodes(prev => {
                const updated = { ...prev };
                // Keep the existing node but update its properties if needed
                if (updated[selectedNode.id]) {
                  // Preserve position and level
                  updated[selectedNode.id] = {
                    ...updated[selectedNode.id],
                    isUpdated: true,
                    personId: savedPersonId,
                    name: savedPersonName.toUpperCase()
                  };
                }
                return updated;
              });
            }
          } catch (refreshError) {
            console.error("Error refreshing parent relations:", refreshError);
          }
        }
      }

      setShowNameEditModal(false);
      setShowModal(false);
    } else {
      toast.error('Failed to add person');
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
    console.error('Error saving name:', error);
    toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to save name');

    setNodes(prev => ({
      ...prev,
      [selectedNode.id]: {
        ...prev[selectedNode.id],
        name: selectedNode.name,
        isUpdated: false
      }
    }));
  } finally {
    console.log("Process completed");
    setIsSavingName(false);
  }
};

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

  const validPrefixes = ['6', '7', '8', '9'];
  if (!validPrefixes.includes(cleanedPhone.charAt(0))) {
    toast.error('Please enter a valid Indian mobile number starting with 6, 7, 8, or 9');
    return;
  }

  setIsSendingInvitation(true);

  try {
    let personId = selectedNode.personId;

    console.log("Selected Node personId for invitation:", personId);
    console.log("Selected Node:", selectedNode);

    if (!personId || personId <= 0) {
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

    if (!personId || personId <= 0) {
      console.error("Invalid personId detected:", personId);
      toast.error('Invalid person information. The person may not be saved yet.');
      setIsSendingInvitation(false);
      return;
    }

    let fatherName = '';
    const isChildRelation = selectedNode.relation.toLowerCase().includes('son') ||
      selectedNode.relation.toLowerCase().includes('daughter');

    if (isChildRelation) {
      const fatherNode = selectedNode.parentId ? nodes[selectedNode.parentId] : null;

      if (fatherNode && fatherNode.id !== 'root') {
        fatherName = fatherNode.name.replace(/\s+/g, ' ').trim();
        console.log(`Detected father for invitation: ${fatherName}`);
      } else if (selectedNode.name.toLowerCase().includes('son of') ||
        selectedNode.name.toLowerCase().includes('daughter of')) {
        const match = selectedNode.name.match(/(?:SON|DAUGHTER)\s+OF\s+(\w+)/i);
        if (match) {
          fatherName = match[1];
          console.log(`Parsed father name from node name: ${fatherName}`);
        }
      }
    }

    console.log(`Sending invitation for person ID: ${personId} to phone: ${cleanedPhone}`);

    const invitationPayload: SendInvitationPayload = {
      mobile_number: cleanedPhone,
      relation_to_me: selectedNodeCalculatedRelation?.base_relation || mapRelationToAPI(selectedNode.relation),
    };

    if (fatherName) {
      invitationPayload.father_name = fatherName;
    }

    invitationPayload.message = `Please join our family tree as ${selectedNode.relation}`;

    const response = await genealogyService.sendInvitation(
      personId,
      invitationPayload
    );

    console.log("Invitation response:", response);

    const isAlreadyConnected = response?.status === 'already_connected' ||
      response?.code === 'already_connected_confirmed' ||
      (response as any)?.existing_connection === true;

    if (response && (response.success !== false || isAlreadyConnected)) {
      let successMessage = response.message || 'Invitation sent successfully!';

      if (isAlreadyConnected) {
        setInvitationError(successMessage);
        toast(successMessage, { icon: 'ℹ️' });
        refreshFamilyTree();
        return;
      }

      if (fatherName) {
        successMessage += ` Will be linked to father: ${fatherName}`;
      }
      toast.success(successMessage);

      startCheckingForAcceptance(personId, selectedNode.name, selectedNode.relation, cleanedPhone, fatherName);

      setShowPhoneModal(false);
      setShowModal(false);
      setPhoneNumber('');
    } else {
      toast.error(response?.message || 'Failed to send invitation');
    }
  } catch (error: any) {
    console.error('Error sending invitation:', error);

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
    if (!selectedNode.isOpen) {
      expandNode(selectedNode.id);
    }
    setActiveParentId(selectedNode.id);
    setAddingPeopleName('');
    setShowAddPeopleModal(true);
  }
};

const handleSaveAddedPeople = async () => {
  console.log("=== FUNCTION CALLED: handleSaveAddedPeople ===");
  if (!selectedNode || !addingPeopleName.trim()) return;

  setIsSavingAddedPeople(true);

  try {
    // Walk up the node tree to find the nearest ancestor with a real personId
    const parentNodeId = selectedNode.parentId;
    const parentPersonId = resolveParentPersonId(selectedNode.id);

    console.log("Resolved parent personId for add_relative_action:", parentPersonId, "(parentNodeId:", parentNodeId, ")");

    if (!parentPersonId) {
      toast.error('Cannot find parent person. Please try again.');
      return;
    }

    // ============ CRITICAL: Get the actual Tamil relation ============
    let tamilRelation = '';

    console.log("=== SELECTED NODE DEBUG ===");
    console.log("selectedNode.relation:", selectedNode.relation);
    console.log("selectedNode.relationLabel:", selectedNode.relationLabel);
    console.log("selectedNode.arrowLabel:", selectedNode.arrowLabel);
    console.log("selectedNode.name:", selectedNode.name);

    // For Ashramam Member nodes, the Tamil relation is in relationLabel
    if (selectedNode.relation === 'Ashramam Member') {
      // Use relationLabel which contains the Tamil relation like "கொழுந்தியாழ்"
      tamilRelation = selectedNode.relationLabel || selectedNode.arrowLabel || selectedNode.name;
      console.log("Ashramam Member - Using relationLabel:", tamilRelation);
    } else {
      // For regular nodes
      tamilRelation = selectedNode.relationLabel || selectedNode.relation;
      console.log("Regular node - Using relation:", tamilRelation);
    }

    // ============ COMPREHENSIVE TAMIL TO ENGLISH ACTION MAP ============
    const tamilToActionMap: { [key: string]: string } = {
      // Father/Mother
      'அப்பா': 'add_father',
      'father': 'add_father',
      'அம்மா': 'add_mother',
      'mother': 'add_mother',

      // Elder Siblings
      'அண்ணன்': 'add_anna',
      'anna': 'add_anna',
      'elder brother': 'add_elder_brother',
      'அக்கா': 'add_akka',
      'akka': 'add_akka',
      'elder sister': 'add_elder_sister',

      // Younger Siblings
      'தம்பி': 'add_thambi',
      'thambi': 'add_thambi',
      'younger brother': 'add_younger_brother',
      'தங்கை': 'add_thangai',
      'thangai': 'add_thangai',
      'younger sister': 'add_younger_sister',

      // Children
      'மகன்': 'add_magan',
      'magan': 'add_magan',
      'son': 'add_son',
      'மகள்': 'add_maghazh',
      'maghazh': 'add_maghazh',
      'daughter': 'add_daughter',

      // Spouse
      'கணவன்': 'add_husband',
      'husband': 'add_husband',
      'மனைவி': 'add_wife',
      'wife': 'add_wife',
      'spouse': 'add_spouse',
      'partner': 'add_partner',

      // Grandparents
      'தாத்தா': 'add_thatha',
      'thatha': 'add_thatha',
      'பாட்டி': 'add_paati',
      'paati': 'add_paati',

      // Grandchildren
      'பேரன்': 'add_peran',
      'peran': 'add_peran',
      'grandson': 'add_peran',
      'பேத்தி': 'add_petthi',
      'petthi': 'add_petthi',
      'granddaughter': 'add_petthi',

      // Uncles
      'பெரியப்பா': 'add_periyappa',
      'periyappa': 'add_periyappa',
      'சித்தப்பா': 'add_chithappa',
      'chithappa': 'add_chithappa',

      // Aunts
      'பெரியம்மா': 'add_periyamma',
      'periyamma': 'add_periyamma',
      'சித்தி': 'add_chithi',
      'chithi': 'add_chithi',

      // Maternal/Paternal
      'மாமா': 'add_mama',
      'mama': 'add_mama',
      'அத்தை': 'add_athai',
      'athai': 'add_athai',

      // In-laws
      'அத்தான்': 'add_athan',
      'athan': 'add_athan',
      'அண்ணி': 'add_anni',
      'anni': 'add_anni',
      'மைத்துனர்': 'add_maithunar',
      'maithunar': 'add_maithunar',
      'mythuni': 'add_mythuni',

      // Other relations - FIXED: Map Tamil to English action
      'கொழுந்தனார்': 'add_kolunthanar',
      'kolunthanar': 'add_kolunthanar',
      'கொழுந்தியாள்': 'add_kolunthiyazh',  // FIXED: Map to correct English action
      'கொழுந்தியாழ்': 'add_kolunthiyazh',  // FIXED: Map to correct English action
      'add_கொழுந்தியாழ்': 'add_kolunthiyazh', // FIXED: Handle case where "add_" is already present
      'kolunthiyazh': 'add_kolunthiyazh',
      'kolunthiyazhl': 'add_kolunthiyazh',
      'மருமகன்': 'add_marumagan',
      'marumagan': 'add_marumagan',
      'son in law': 'add_marumagan',
      'மருமகள்': 'add_marumagal',
      'marumagal': 'add_marumagal',
      'daughter in law': 'add_marumagal'
    };

    // ============ CONVERT TO ENGLISH ACTION ============
    let action = null;

    console.log("=== MAPPING DEBUG ===");
    console.log("tamilRelation to map:", tamilRelation);

    // Try exact match
    const lowercasedRelation = tamilRelation.toLowerCase().trim();
    action = tamilToActionMap[lowercasedRelation];
    console.log("Exact match result:", action);

    // If not found, try without spaces
    if (!action) {
      const noSpaces = lowercasedRelation.replace(/\s+/g, '');
      action = tamilToActionMap[noSpaces];
      console.log("No spaces match result:", action);
    }

    // If still not found, try to extract the Tamil part (if it's in a string like "X-Y")
    if (!action && lowercasedRelation.includes('-')) {
      const parts = lowercasedRelation.split('-');
      for (const part of parts) {
        const trimmedPart = part.trim();
        action = tamilToActionMap[trimmedPart];
        if (action) {
          console.log(`Found match from part "${trimmedPart}":`, action);
          break;
        }
      }
    }

    // Special fallback for கொழுந்தியாழ் (ensure this works)
    if (!action) {
      if (lowercasedRelation.includes('கொழுந்தியாழ்') ||
        lowercasedRelation.includes('கொழுந்தியாள்') ||
        lowercasedRelation.includes('kolunthiyazh')) {
        action = 'add_kolunthiyazh';
        console.log("Special fallback for கொழுந்தியாழ் - action:", action);
      }
    }

    // If still no action, try to see if it's a direct match in valid actions
    if (!action) {
      const validActions = [
        'add_father', 'add_mother', 'add_son', 'add_daughter',
        'add_elder_brother', 'add_younger_brother', 'add_elder_sister', 'add_younger_sister',
        'add_husband', 'add_wife', 'add_spouse', 'add_partner',
        'add_maithunar', 'add_mythuni', 'add_thatha', 'add_paati',
        'add_periyappa', 'add_chithappa', 'add_periyamma', 'add_chithi',
        'add_mama', 'add_athai', 'add_athan', 'add_anni',
        'add_kolunthanar', 'add_kolunthiyazh', 'add_marumagan', 'add_marumagal',
        'add_peran', 'add_petthi', 'add_anna', 'add_akka',
        'add_thambi', 'add_thangai', 'add_magan', 'add_maghazh'
      ];

      // Check if the relation itself is a valid action
      for (const validAction of validActions) {
        if (validAction === lowercasedRelation) {
          action = validAction;
          console.log("Direct valid action match:", action);
          break;
        }
      }
    }

    // Validate action - CRITICAL: Ensure action doesn't contain Tamil characters
    if (!action || !action.startsWith('add_')) {
      console.error("❌ Could not determine valid action for relation:", tamilRelation);
      toast.error(`Cannot add person for "${tamilRelation}". Invalid relation.`);
      setIsSavingAddedPeople(false);
      return;
    }

    // Final validation - ensure no Tamil characters in action
    const tamilRegex = /[\u0B80-\u0BFF]/;
    if (tamilRegex.test(action)) {
      console.error("❌ Action still contains Tamil characters:", action);
      toast.error(`Invalid action: ${action}. Please contact support.`);
      setIsSavingAddedPeople(false);
      return;
    }

    console.log(`✅ Valid action for "${tamilRelation}" → "${action}"`);

    const payload: AddRelativeActionPayload = {
      action: action,
      full_name: addingPeopleName.trim()
    };

    console.log(`Calling addRelativeAction for person ${parentPersonId} with payload:`, payload);
    const response = await genealogyService.addRelativeAction(parentPersonId, payload);

    if (response && response.success !== false) {
      toast.success(response.message || 'Added successfully');

      // Refresh the parent node tree
      try {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (parentNodeId === 'root' || !nodes[parentNodeId || '']?.personId) {
          const relationsData = await genealogyService.getPersonRelations(parentPersonId);
          const rootGender = nodes['root']?.gender || currentPerson?.gender || 'M';
          buildNodesFromRelations(relationsData, rootGender, 'root');
        } else {
          const parentNode = nodes[parentNodeId || ''];
          if (parentNode?.personId) {
            const flowResponse = await genealogyService.getNextFlow(parentNode.personId);
            if (flowResponse) {
              buildNodesFromRelationsForNextFlow(flowResponse, parentNode.gender || 'M', parentNodeId || 'root');
            }
          }
        }
      } catch (refreshError) {
        console.error("Error refreshing after add:", refreshError);
      }

      setShowAddPeopleModal(false);
      setShowModal(false);
    } else {
      toast.error('Failed to add person');
    }
  } catch (error: any) {
    console.error('Error adding person:', error);
    toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to add person');
  } finally {
    setIsSavingAddedPeople(false);
  }
};

const handleSaveAshramamRelative = async () => {
  console.log("=== handleSaveAshramamRelative STARTED ===");

  if (!selectedNode) {
    toast.error(isTamil ? 'முதலில் ஒரு நபரை தேர்வு செய்யவும்' : 'Please select a person first');
    return;
  }

  if (!selectedNode.parentId) {
    toast.error(isTamil ? 'தவறான முனை' : 'Invalid node');
    return;
  }

  if (!newAshramamName.trim()) {
    toast.error(isTamil ? 'பெயரை உள்ளிடவும்' : 'Please enter a name');
    return;
  }

  if (!newAshramamRelation.trim()) {
    toast.error(isTamil ? 'இரண்டாம் உறவுமுறையை உள்ளிடவும்' : 'Please enter second relation');
    return;
  }

  if (!newAshramamFirstRelation.trim()) {
    toast.error(isTamil ? 'முதல் உறவுமுறையை உள்ளிடவும்' : 'Please enter first relation');
    return;
  }

  setIsSavingAshramamRelative(true);

  try {
    const ashramamNode = nodes[selectedNode.parentId];
    let targetPersonId: number | undefined =
      ashramamNode?.personId ||
      (ashramamNode?.parentId ? nodes[ashramamNode.parentId]?.personId : undefined) ||
      currentPerson?.id;

    console.log("handleSaveAshramamRelative - from relation:", newAshramamFirstRelation);
    console.log("handleSaveAshramamRelative - to relation:", newAshramamRelation);
    console.log("handleSaveAshramamRelative - resolved targetPersonId:", targetPersonId);

    if (!targetPersonId) {
      toast.error(isTamil ? 'மூல நபர் கிடைக்கவில்லை' : 'Parent person not found');
      return;
    }

    // Map Tamil relation names to English names
    const tamilToEnglishMap: { [key: string]: string } = {
      'அப்பா': 'Father',
      'father': 'Father',
      'அம்மா': 'Mother',
      'mother': 'Mother',
      'அண்ணன்': 'Elder Brother',
      'elder brother': 'Elder Brother',
      'தம்பி': 'Younger Brother',
      'younger brother': 'Younger Brother',
      'அக்கா': 'Elder Sister',
      'elder sister': 'Elder Sister',
      'தங்கை': 'Younger Sister',
      'younger sister': 'Younger Sister',
      'மகன்': 'Son',
      'son': 'Son',
      'மகள்': 'Daughter',
      'daughter': 'Daughter',
      'கணவன்': 'Husband',
      'husband': 'Husband',
      'மனைவி': 'Wife',
      'wife': 'Wife',
      'தாத்தா': 'Grandfather',
      'grandfather': 'Grandfather',
      'பாட்டி': 'Grandmother',
      'grandmother': 'Grandmother',
      'பேரன்': 'Grandson',
      'grandson': 'Grandson',
      'பேத்தி': 'Granddaughter',
      'granddaughter': 'Granddaughter',
      'மருமகன்': 'Son-in-law',
      'son in law': 'Son-in-law',
      'மருமகள்': 'Daughter-in-law',
      'daughter in law': 'Daughter-in-law'
    };

    const normalizedFromRelation = newAshramamFirstRelation.trim().toLowerCase();
    const normalizedToRelation = newAshramamRelation.trim().toLowerCase();

    const mappedFromRelation = tamilToEnglishMap[normalizedFromRelation] || newAshramamFirstRelation.trim();
    const mappedToRelation = tamilToEnglishMap[normalizedToRelation] || newAshramamRelation.trim();

    console.log("Mapped from relation:", mappedFromRelation);
    console.log("Mapped to relation:", mappedToRelation);

    const payload = {
      from_relationship_name: mappedFromRelation,
      to_relationship_name: mappedToRelation,
      name: newAshramamName.trim(),
      gender: newAshramamGender
    };

    console.log("Calling addCustomRelative with payload:", payload);

    // ============ POST API CALL ============
    const response = await genealogyService.addCustomRelative(targetPersonId, payload);

    console.log("Response received:", response);

    if (response && (response.success || response.person || response.new_person)) {
      toast.success(response.message || 'Added successfully');

      const personData = response.new_person || response.person || {};
      const relationLabel = response.relation?.label || mappedToRelation;

      // Create new member data
      const newMember = {
        id: personData.id || Date.now(),
        name: (personData.full_name || personData.name || newAshramamName).trim(),
        relation: relationLabel,
        relation_code: response.relation?.code || mappedToRelation,
        gender: personData.gender || newAshramamGender
      };

      // ============ CRITICAL FIX: Wait for backend to process before refreshing ============
      // Add a delay to ensure backend has processed the new relationship
      await new Promise(resolve => setTimeout(resolve, 1000));

      // ============ GET API CALL - Refresh Ashramam relations ============
      try {
        console.log(`🔄 Refreshing Ashramam relations with GET: /api/genealogy/persons/${targetPersonId}/ashramam-relations/`);

        // Call the GET API to fetch updated Ashramam relations
        const freshData = await genealogyService.getAshramamRelations(targetPersonId);

        console.log("📥 Fresh Ashramam relations data:", freshData);

        if (freshData && freshData.ashramam_relations) {
          const myRelatives = freshData.ashramam_relations.my_relatives || [];
          const iAmRelativeTo = freshData.ashramam_relations.i_am_relative_to || [];

          // Map the fresh data - this will include the newly added member
          const mappedExtra = [...myRelatives, ...iAmRelativeTo].map((rel: any) => {
            // Get the label correctly
            const label = rel.relation_label?.label || 
                         rel.relation?.label || 
                         rel.label || 
                         rel.relation_code;

            console.log(`Mapping ${rel.person?.full_name || rel.full_name} with label:`, label);

            return {
              id: rel.person?.id || rel.id,
              name: rel.person?.full_name || rel.person?.name || rel.full_name || rel.name || '',
              relation: label,
              relation_code: rel.relation?.code || rel.relation_code,
              gender: rel.person?.gender || rel.gender || 'M'
            };
          });

          console.log("✨ Mapped fresh Ashramam members with labels:", mappedExtra);

          // Update state with fresh data from GET response
          setAshramamExtraRelations(mappedExtra);

          // Update standard options if available
          let standardOps = ashramamStandardOptions;
          if (freshData.add_options && freshData.add_options.standard_ashramam) {
            standardOps = freshData.add_options.standard_ashramam;
            setAshramamStandardOptions(standardOps);
          }

          // Re-expand the Ashramam node with fresh data (which now includes the new member)
          if (selectedNode.parentId) {
            expandAshramam(selectedNode.parentId, mappedExtra, standardOps);
          }

          // Verify the new member is in the response
          const isNewMemberInResponse = mappedExtra.some(member => 
            member.name === newMember.name || 
            (member.id && member.id === newMember.id)
          );

          if (isNewMemberInResponse) {
            console.log("✅ New member successfully retrieved from GET response");
            toast.success(isTamil ? 'உறுப்பினர் வெற்றிகரமாக சேர்க்கப்பட்டார்' : 'Member added successfully');
          } else {
            console.warn("⚠️ New member not found in GET response, might need more time");
            toast(isTamil ? 'உறுப்பினர் சேர்க்கப்பட்டார், ஆனால் பட்டியலில் காட்ட சிறிது நேரம் ஆகும்' : 'Member added, but may take a moment to appear', { icon: '⏳' });
            
            // If new member not in response, add it temporarily from POST response
            const updatedExtraWithNew = [...mappedExtra, newMember];
            setAshramamExtraRelations(updatedExtraWithNew);
            if (selectedNode.parentId) {
              expandAshramam(selectedNode.parentId, updatedExtraWithNew, standardOps);
            }
          }
        } else {
          console.error("❌ Invalid response structure from GET API");
          // Fallback: use the new member from POST response
          const updatedExtraRelations = [...ashramamExtraRelations, newMember];
          setAshramamExtraRelations(updatedExtraRelations);
          if (selectedNode.parentId) {
            expandAshramam(selectedNode.parentId, updatedExtraRelations);
          }
        }
      } catch (e) {
        console.error("❌ Error fetching updated ashramam relations:", e);
        // Fallback: add the new member from POST response
        const updatedExtraRelations = [...ashramamExtraRelations, newMember];
        setAshramamExtraRelations(updatedExtraRelations);
        if (selectedNode.parentId) {
          expandAshramam(selectedNode.parentId, updatedExtraRelations);
        }
      }

      // Clear form and close modal
      setNewAshramamName('');
      setNewAshramamRelation('');
      setNewAshramamFirstRelation('');
      setNewAshramamGender('M');
      setShowAddAshramamModal(false);
    } else {
      toast.error(response?.message || 'Failed to add member');
    }
  } catch (error: any) {
    console.error('Error in handleSaveAshramamRelative:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to add member';
    toast.error(errorMessage);
  } finally {
    setIsSavingAshramamRelative(false);
  }
};

const handleWheel = useCallback((e: React.WheelEvent) => {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return;

  if (e.ctrlKey) {
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

const activeNodes = useMemo(() => {
  return Object.values(nodes).filter(n => {
    if (n.id === 'root') return true;
    if (n.parentId && nodes[n.parentId]?.isOpen) return true;
    if (n.level === 1 && n.isUpdated && n.parentId === 'root') return true;
    return false;
  });
}, [nodes]);

const handleDownloadPdf = async () => {
  if (!sidePanelScrollRef.current) return;

  setIsDownloadingPdf(true);
  const toastId = toast.loading(isTamil ? 'பிடிஎப் தயாராகிறது...' : 'Preparing PDF...');

  try {
    const element = sidePanelScrollRef.current;

    const clone = element.cloneNode(true) as HTMLElement;

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '500px';
    container.style.zIndex = '-1000';
    container.appendChild(clone);
    document.body.appendChild(container);

    const pdfHeader = clone.querySelector('#pdf-header') as HTMLElement;
    const pdfSummary = clone.querySelector('#pdf-summary') as HTMLElement;
    const pdfFooter = clone.querySelector('#pdf-footer') as HTMLElement;

    if (pdfHeader) pdfHeader.style.display = 'block';
    if (pdfSummary) pdfSummary.style.display = 'block';
    if (pdfFooter) pdfFooter.style.display = 'block';

    const canvas = await html2canvas(clone, {
      useCORS: true,
      logging: false,
      background: '#ffffff',
      width: 500,
      height: clone.scrollHeight,
    });

    document.body.removeChild(container);

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [canvas.width / 3, canvas.height / 3]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = isTamil ? `குடும்ப_பயண_அறிக்கை_${timestamp}.pdf` : `Family_Journey_Report_${timestamp}.pdf`;
    pdf.save(fileName);

    toast.success(isTamil ? 'அறிக்கை வெற்றிகரமாக பதிவிறக்கம் செய்யப்பட்டது' : 'Report downloaded successfully', { id: toastId });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    toast.error(isTamil ? 'பதிவிறக்கம் செய்வதில் பிழை' : 'Failed to download PDF', { id: toastId });
  } finally {
    setIsDownloadingPdf(false);
  }
};

// ============ INVITATION BANNER COMPONENT ============

const InvitationBanner = () => {
  if (!invitationData || !showInvitationBanner) return null;

  const { invitation, relationship_path, your_relation_to_sender, message } = invitationData;
  const path = relationship_path?.path || [];
  const pathVisual = relationship_path?.path_visual || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-3xl px-4"
    >
      <div className="bg-linear-to-r from-amber-500 to-orange-500 rounded-2xl shadow-2xl border border-amber-400 overflow-hidden">
        <div className="bg-white/10 backdrop-blur-sm px-6 py-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {isTamil ? 'அழைப்பு விவரங்கள்' : 'Invitation Details'}
              </h2>
            </div>
            <button
              onClick={() => setShowInvitationBanner(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-white">
          <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-lg text-amber-800 font-medium">{message}</p>
          </div>

          {your_relation_to_sender && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                {isTamil ? 'உங்கள் உறவுமுறை' : 'Your Relationship'}
              </h3>
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-700">
                    {your_relation_to_sender.label}
                  </div>
                  <div className="text-sm text-blue-600">
                    {your_relation_to_sender.explanation}
                  </div>
                </div>
              </div>
            </div>
          )}

          {path.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                {isTamil ? 'உறவுமுறை பாதை' : 'Relationship Path'}
              </h3>
              <div className="space-y-2">
                {path.map((step: any, index: number) => (
                  <div key={index} className="flex items-center">
                    <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.is_current_user
                        ? 'bg-green-500 text-white'
                        : 'bg-orange-500 text-white'
                        }`}>
                        {step.person_name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{step.person_name}</div>
                        <div className="text-xs text-gray-500">
                          {step.relation_label}
                        </div>
                      </div>
                    </div>
                    {index < path.length - 1 && (
                      <ChevronRight className="h-5 w-5 text-gray-400 mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                if (invitation.person?.id) {
                  navigateToPersonById(invitation.person.id);
                }
              }}
              className="flex-1 py-3 bg-linear-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <Eye className="h-5 w-5" />
              {isTamil ? 'நபரைப் பார்க்க' : 'View Person'}
            </button>
            <button
              onClick={() => setShowInvitationBanner(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              {isTamil ? 'மூடு' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============ CONNECTION PATH STATE ============

const [showConnectionPath, setShowConnectionPath] = useState(false);
const [connectionPathNodes, setConnectionPathNodes] = useState<any[]>([]);

// ============ PATH INFO MODAL ============
const PathInfoModal = () => {
  if (!showPathInfoModal || !selectedNode || !lastNodeInfo) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowPathInfoModal(false)}>
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button
          onClick={() => setShowPathInfoModal(false)}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-blue-600 rounded-full">
            <Info size={32} className="text-white" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          {isTamil ? 'அழைப்பு விவரங்கள்' : 'Invitation Details'}
        </h2>

        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <p className="text-slate-300 text-sm mb-2">
            {isTamil ? 'இந்த நபர் உங்களுக்கு அழைப்பு அனுப்பியுள்ளார்' : 'This person has sent you an invitation'}
          </p>
          <p className="text-white font-bold text-lg mb-1">{lastNodeInfo.personName}</p>

          <div className="mt-3 p-3 bg-slate-700 rounded-lg">
            <p className="text-amber-400 text-xs font-medium mb-1">
              {isTamil ? 'உறவுமுறை பாதை:' : 'Relationship path:'}
            </p>
            <p className="text-white text-sm font-medium wrap-break-words">
              {lastNodeInfo.pathString}
            </p>
          </div>

          <div className="mt-3">
            {pathNodes.map((step, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-green-500' :
                    index === pathNodes.length - 1 ? 'bg-blue-500' :
                      index === 1 ? 'bg-red-500' : 'bg-orange-500'
                  } text-white`}>
                  {index + 1}
                </div>
                <span className="text-slate-300 text-sm">{step.person_name}</span>
                {index < pathNodes.length - 1 && (
                  <span className="text-slate-500 text-xs mx-1">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowPathInfoModal(false)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
        >
          {isTamil ? 'சரி' : 'OK'}
        </button>
      </div>
    </div>
  );
};

// ============ RENDER ============

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
    {/* Loading Overlay */}
    <LoadingOverlay
      show={isLoadingPerson || isDownloadingPdf}
      message={
        isLoadingPerson
          ? (isTamil ? 'நபர் தகவலை ஏற்றுகிறது...' : 'Loading person details...')
          : (isTamil ? 'பிடிஎப் உருவாக்குகிறது...' : 'Generating PDF...')
      }
      size="lg"
    />
    {/* ============ INVITATION BANNER ============ */}
    <AnimatePresence>
      <InvitationBanner />
    </AnimatePresence>

    {/* ============ PATH NAVIGATION INDICATOR ============ */}
    {isNavigatingPath && (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                    bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg 
                    flex items-center gap-3 animate-pulse">
        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
        <span className="font-medium">
          {isTamil ? `பாதை: படி ${currentPathStep} / ${relationshipPath?.total_steps}` : `Path: Step ${currentPathStep} of ${relationshipPath?.total_steps}`}
        </span>
      </div>
    )}

    {/* ============ TARGET NODE HIGHLIGHT ============ */}
    {targetPathNodeId && !isNavigatingPath && (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                    bg-green-600 text-white px-6 py-3 rounded-full shadow-lg">
        {isTamil ? '✓ பாதை முடிந்தது - இலக்கு நபர் சிறப்பிக்கப்பட்டார்' : '✓ Path completed - Target node highlighted'}
      </div>
    )}

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

        {/* Back Button */}
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

            {activeButtonIndex === 0 ? (
              <div className="w-full h-full flex items-stretch">
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

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
              {activeButtonIndex === 2 ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                  <div className="w-3 h-3 rounded-full bg-white/80"></div>
                </>
              ) : (
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
                <div className="w-6 h-6 bg-linear-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Users size={14} className="text-white" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Journey</h2>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!isPanelCollapsed && (
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="p-2 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors disabled:opacity-50"
                title={isTamil ? 'பிடிஎப் பதிவிறக்கம்' : 'Download PDF'}
              >
                {isDownloadingPdf ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={16} />
                )}
              </button>
            )}
            <button
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              title={isPanelCollapsed ? 'Expand' : 'Collapse'}
            >
              <ChevronRight size={16} className={`transition-transform ${isPanelCollapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Panel Content */}
        {!isPanelCollapsed && (
          <div
            ref={sidePanelScrollRef}
            className="flex-1 overflow-y-auto p-4 bg-white"
          >
            {/* PDF-Only Header */}
            <div id="pdf-header" className="hidden mb-12 text-center border-b-4 border-blue-600 pb-8 bg-linear-to-b from-blue-50 to-white rounded-t-3xl pt-6">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl rotate-3">
                  <Users size={40} className="text-white -rotate-3" />
                </div>
              </div>
              <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tight mb-2">
                {isTamil ? 'கொடிவழி பயண அறிக்கை' : 'Genealogy Journey Report'}
              </h1>
              <div className="h-1.5 w-24 bg-blue-500 mx-auto my-4 rounded-full"></div>

              <div className="grid grid-cols-2 gap-4 px-10 text-left mt-6">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                    {isTamil ? 'உறுப்பினர் பெயர்' : 'Primary Member'}
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {profile.firstname} {profile.lastname}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                    {isTamil ? 'பயண தேதி' : 'Date of Report'}
                  </p>
                  <p className="text-sm font-bold text-gray-800">
                    {new Date().toLocaleDateString(isTamil ? 'ta-IN' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div className="mt-6 px-10">
                <div className="bg-blue-600 text-white p-3 rounded-xl flex justify-between items-center shadow-lg">
                  <span className="text-xs font-black uppercase tracking-wider">{isTamil ? 'மொத்த தலைமுறைகள்' : 'Total Path Steps'}</span>
                  <span className="text-xl font-black">{navigationHistory.length}</span>
                </div>
              </div>
            </div>

            <style>{`
              .clip-path-arrow-down {
                clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
              }
            `}</style>

            {/* Main container with central guide line */}
            <div className="relative">
              {/* Central vertical line */}
              <div className="absolute left-1/2 top-2 bottom-2 transform -translate-x-1/2 w-px bg-linear-to-b from-gray-200 via-gray-300 to-gray-200"></div>

              <div className="space-y-8 relative">
                {navigationHistory.map((item, index) => {
                  const isLast = index === navigationHistory.length - 1;
                  const isFirst = index === 0;

                  return (
                    <div key={item.id} className="relative flex flex-col items-center">

                      {/* Circle Card */}
                      <div className="relative group cursor-pointer"
                        onClick={() => {
                          console.log(`Side panel clicked: ${item.name} at index ${index}`);
                          navigateToHistoryItem(item, index);
                        }}>
                        {/* Relation Label to the Left */}
                        {item.calculatedRelation && (
                          <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-16 text-right animate-fadeIn">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50/80 backdrop-blur-xs px-2 py-0.5 rounded border border-blue-100 shadow-xs uppercase tracking-tighter">
                              {item.calculatedRelation}
                            </span>
                          </div>
                        )}

                        {/* Circle shape */}
                        <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center p-2 transition-all duration-300 ${isLast
                          ? 'bg-linear-to-br from-green-500 to-green-600 border-2 border-green-400 shadow-lg scale-110'
                          : 'bg-linear-to-br from-gray-100 to-gray-200 border border-gray-300 shadow-xs hover:border-green-300 hover:shadow-sm'
                          }`}>
                          {/* User icon */}
                          {item.isUpdated && (
                            <User
                              size={28}
                              className={`${isLast ? 'text-white' : 'text-gray-400'}`}
                            />
                          )}

                          {/* Content */}
                          <div className="text-center space-y-0.5">
                            <div className={`text-[10px] font-black tracking-tight leading-none truncate w-16 ${isLast ? 'text-white' : 'text-gray-700'}`}>
                              {item.name}
                            </div>
                            <div className={`text-[8px] font-bold leading-none ${isLast ? 'text-green-100' : 'text-green-600/80'}`}>
                              {item.relation}
                            </div>
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

                      {/* Double-sided arrow with relationship label */}
                      {!isLast && (
                        <div className="relative mt-4 mb-4">
                          {/* Connection line */}
                          <div className="flex flex-col items-center">
                            <div className="w-0.5 h-4 bg-linear-to-b from-blue-400 to-blue-300"></div>

                            {/* Double-sided arrow container */}
                            <div className="relative my-2">
                              {(() => {
                                const fullLabel = navigationHistory[index + 1]?.arrowLabel || 'Next';
                                const labelParts = fullLabel.split(/->|→/);
                                const hasSplit = labelParts.length > 1;
                                const topLabel = hasSplit ? labelParts[0].trim() : '';
                                const bottomLabel = hasSplit ? labelParts[1].trim() : fullLabel;

                                return (
                                  <>
                                    {/* Label ABOVE arrow */}
                                    {hasSplit && (
                                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap z-20">
                                        <span className="text-[9px] font-bold text-blue-700 bg-white/90 px-2 py-0.5 rounded-full shadow-xs border border-blue-100 uppercase backdrop-blur-sm">
                                          {topLabel}
                                        </span>
                                      </div>
                                    )}

                                    {/* Outer circle */}
                                    <div className="w-10 h-10 rounded-full bg-linear-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform z-10 relative">
                                      {/* Double-sided arrow */}
                                      <div className="flex items-center gap-1">
                                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-8 border-r-white"></div>
                                        <div className="w-1 h-4 bg-white"></div>
                                        <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-8 border-l-white"></div>
                                      </div>
                                    </div>

                                    {/* Label BELOW arrow */}
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

            {/* Summary section - PDF ONLY */}
            <div id="pdf-summary" className="hidden mt-12 pt-6 border-t border-gray-200">
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

                <div className="text-[10px] text-gray-400 mt-4 text-center font-bold italic">
                  End of current navigation path
                </div>
              </div>
            </div>

            {/* PDF-Only Footer */}
            <div id="pdf-footer" className="hidden mt-20 pt-10 border-t-2 border-gray-100 text-center pb-10">
              <div className="flex justify-center gap-2 mb-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-blue-200"></div>
                ))}
              </div>
              <p className="text-blue-600 font-black text-sm uppercase tracking-widest mb-2">கொடிவழி வரைபடம்</p>
              <p className="text-gray-400 text-[10px] font-bold">
                {isTamil ? 'நபர்களின் உறவுமுறை மற்றும் தலைமுறைகளை அறியும் தளம்' : 'Platform for exploring family relationships and generations'}
              </p>
            </div>
          </div>
        )}
      </div>
    )}

    {/* Collapsed Panel */}
    {isPanelCollapsed && (
      <div className="flex flex-col items-center justify-center flex-1 p-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center shadow-md">
            <span className="text-lg font-bold text-blue-700">{navigationHistory.length}</span>
          </div>
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

        <div className="mt-6 flex flex-col items-center space-y-1">
          {[...Array(Math.min(3, navigationHistory.length))].map((_, i) => (
            <div key={i} className="w-3 h-4 rounded-full bg-linear-to-br from-gray-300 to-gray-400"></div>
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

    {/* Generation Info Box */}
    {generationInfo && (
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
    )}

    {/* Active invitations indicator */}
    {activeInvitations.length > 0 && (
      <div className="absolute top-24 left-4 z-50 bg-amber-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
        <Bell size={14} />
        <span>{activeInvitations.length} pending invitation(s)</span>
      </div>
    )}

    {/* Refresh button */}
    <button
      onClick={refreshFamilyTree}
      className="absolute top-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full shadow-lg flex items-center justify-center"
      title="Refresh Family Tree"
    >
      <RefreshCw size={18} />
    </button>

    {(isLoadingRelations || isLoadingPerson) && (
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-blue-500 text-white px-4 py-2 rounded-full text-sm animate-pulse">
        {isLoadingPerson ? t('loading') : t('loading')}
      </div>
    )}

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
            {/* Double-sided arrow markers */}
            <marker id="arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto">
              <path d="M10,0 L0,5 L10,10 Z" fill="#f1b434" />
            </marker>
            <marker id="arrow-end" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#f1b434" />
            </marker>
            <marker id="ashramam-arrow-start" markerWidth="8" markerHeight="8" refX="0" refY="4" orient="auto">
              <path d="M8,0 L0,4 L8,8 Z" fill="#9b59b6" />
            </marker>
            <marker id="ashramam-arrow-end" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#9b59b6" />
            </marker>
            <marker id="existing-arrow-start" markerWidth="10" markerHeight="10" refX="0" refY="5" orient="auto">
              <path d="M10,0 L0,5 L10,10 Z" fill="#10b981" />
            </marker>
            <marker id="existing-arrow-end" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#10b981" />
            </marker>
          </defs>

          {/* Ashramam lines */}
          {Object.values(nodes).map(node => {
            if (!node.isOpen || node.relation !== 'Ashramam') return null;

            const children = getNodeChildren(node.id);
            const isDimmed = activeParentId !== node.id;

            return children.map((child, i) => {
              const dx = child.position.x - node.position.x;
              const dy = child.position.y - node.position.y;
              const angle = Math.atan2(dy, dx);
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Use circle radius
              const r1 = 45; // node circle radius
              const r2 = 45; // child circle radius

              const x1 = node.position.x + Math.cos(angle) * r1;
              const y1 = node.position.y + Math.sin(angle) * r1;
              const x2 = child.position.x - Math.cos(angle) * r2;
              const y2 = child.position.y - Math.sin(angle) * r2;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const ux = -(y2 - y1) / distance;
              const uy = (x2 - x1) / distance;

              const curveOffset = 25;
              const cx = midX + ux * curveOffset;
              const cy = midY + uy * curveOffset;

              const labelDistance = 0.5;
              const t = labelDistance;
              const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
              const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

              const tx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
              const ty = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);
              const labelAngle = Math.atan2(ty, tx);

              const sideOffset = 20;
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
                    markerStart="url(#ashramam-arrow-start)"
                    markerEnd="url(#ashramam-arrow-end)"
                    opacity={isDimmed ? 0.2 : 0.7}
                    style={{ transition: 'opacity 0.6s' }}
                  />
                  {child.relationLabel && (
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
                        fill: '#4b5563',
                        userSelect: 'none',
                        filter: 'drop-shadow(0px 0px 1px white) drop-shadow(0px 0px 2px white)',
                        paintOrder: 'stroke fill',
                        stroke: 'white',
                        strokeWidth: '1px',
                        strokeLinejoin: 'round',
                      }}
                      transform={`rotate(${labelAngle * (180 / Math.PI)}, ${labelX}, ${labelY})`}
                    >
                      {child.arrowLabel ? child.arrowLabel : getArrowLabel(
                        node.gender || 'M',
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

          {/* Regular lines */}
          {Object.values(nodes).map(node => {
            if (!node.isOpen || node.relation === 'Ashramam') return null;

            const parentGender = node.id === 'root' ? (currentPerson?.gender || profile.gender || 'M') : (node.gender || 'M');
            const isDimmed = activeParentId && activeParentId !== node.id;
            const children = getNodeChildren(node.id);

            return children.map((child) => {
              if (!child) return null;

              const dx = child.position.x - node.position.x;
              const dy = child.position.y - node.position.y;
              const angle = Math.atan2(dy, dx);
              const distance = Math.sqrt(dx * dx + dy * dy);

              // Use circle radius
              const r1 = 45; // node circle radius
              const r2 = 45; // child circle radius

              const strokeColor = child.isUpdated ? "#10b981" : "#f1b434";
              const markerStartId = child.isUpdated ? "existing-arrow-start" : "arrow-start";
              const markerEndId = child.isUpdated ? "existing-arrow-end" : "arrow-end";

              const x1 = node.position.x + Math.cos(angle) * r1;
              const y1 = node.position.y + Math.sin(angle) * r1;
              const x2 = child.position.x - Math.cos(angle) * r2;
              const y2 = child.position.y - Math.sin(angle) * r2;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              const ux = -(y2 - y1) / distance;
              const uy = (x2 - x1) / distance;

              const curveOffset = 30;
              const cx = midX + ux * curveOffset;
              const cy = midY + uy * curveOffset;

              const labelDistance = 0.5;
              const t = labelDistance;
              const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
              const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;

              const tx = 2 * (1 - t) * (cx - x1) + 2 * t * (x2 - cx);
              const ty = 2 * (1 - t) * (cy - y1) + 2 * t * (y2 - cy);
              const labelAngle = Math.atan2(ty, tx);

              const sideOffset = 25;
              const labelX = bx + ux * sideOffset;
              const labelY = by + uy * sideOffset;

              return (
                <g key={`line-${node.id}-${child.id}`}>
                  <path
                    d={`M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={child.isUpdated ? "3" : "2.5"}
                    markerStart={`url(#${markerStartId})`}
                    markerEnd={`url(#${markerEndId})`}
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
                        fill: '#374151',
                        userSelect: 'none',
                        filter: 'drop-shadow(0px 0px 1px white) drop-shadow(0px 0px 2px white)',
                        paintOrder: 'stroke fill',
                        stroke: 'white',
                        strokeWidth: '1px',
                        strokeLinejoin: 'round',
                      }}
                      transform={`rotate(${labelAngle * (180 / Math.PI)}, ${labelX}, ${labelY})`}
                    >
                      {child.arrowLabel ? child.arrowLabel : getArrowLabel(
                        node.gender || 'M',
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

          {/* Nodes */}
          {activeNodes.map(node => {
            const isRoot = node.id === 'root';
            const isAshramam = node.relation === 'Ashramam';
            const isAshramamLeaf = node.relation === 'Ashramam Member';
            const isAshramamAdd = node.relation === 'Ashramam Add';
            const baseScaleFactor = Math.pow(0.95, node.level);

            // Check if this node should blink (target of path navigation - my father node)
            const isBlinking = (blinkingNodeId && node.id === blinkingNodeId) ||
              (blinkingPersonId && node.personId && Number(node.personId) === Number(blinkingPersonId));

            const scaleFactor = isBlinking ? baseScaleFactor * 1.4 : baseScaleFactor;

            const r = 45 * scaleFactor;

            const isHighlighted = !activeParentId ||
              node.id === activeParentId ||
              node.parentId === activeParentId;

            // ============ CHANGED: Root node color to yellow ============
            let fillColor = isRoot ? "#fbbf24" : "#9ca3af"; // Yellow for root
            let strokeColor = isRoot ? "#f59e0b" : "#6b7280"; // Amber border for root

            // Order matters: check conditions in correct priority
            if (isBlinking) {
              fillColor = "#ef4444";
              strokeColor = "#dc2626";
            } else if (connectionPathNodes.some(pathNode => {
              const nodeRelation = node.relation?.toLowerCase() || '';
              const pathRelation = pathNode.relation_label?.toLowerCase() || '';

              const isMatch = (nodeRelation === pathRelation ||
                (nodeRelation === 'hus' && pathRelation === 'husband')) &&
                !pathNode.person.is_current_user;

              if (isMatch) {
                console.log("Found blinking match for relation:", {
                  nodeRelation,
                  pathRelation,
                  nodeId: node.id
                });
              }
              return isMatch;
            })) {
              fillColor = "#ef4444";
              strokeColor = "#dc2626";
            } else if (node.image && node.image !== 'null') {
              fillColor = "#10b981";
              strokeColor = "#059669";
            } else if (node.isUpdated) {
              // If it's an updated Ashramam Leaf, the user wants it pink
              if (isAshramamLeaf) {
                fillColor = "#ec4899"; // Pink
                strokeColor = "#be185d";
              } else {
                fillColor = "#10b981";
                strokeColor = "#059669";
              }
            } else if (isAshramam) {
              fillColor = "#9b59b6";
              strokeColor = "#8e44ad";
            } else if (isAshramamLeaf) {
              fillColor = "#3498db";
              strokeColor = "#2980b9";
            } else if (isAshramamAdd) {
              fillColor = "#f39c12";
              strokeColor = "#e67e22";
            }

            // ============ ROUGH CIRCLE: Replace perfect circles with rough paths ============
            return (
              <g
                key={`node-${node.id}`}
                transform={`translate(${node.position.x}, ${node.position.y})`}
                className={`pointer-events-auto ${isBlinking ? 'blink-red-circle' : ''}`}
                style={{
                  opacity: isHighlighted ? 1 : 0.3,
                  transition: 'opacity 0.6s, fill 0.3s, stroke 0.3s, transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  cursor: 'pointer'
                }}
                onClick={() => handleNodeClick(node)}
                onMouseEnter={(e) => handleNodeHoverEnter(node, e)}
                onMouseLeave={handleNodeHoverLeave}
                onTouchStart={(e) => handleNodeTouchStart(node, e)}
                onTouchEnd={handleNodeTouchEnd}
              >
                {isRoot && node.image && node.image !== 'null' ? (
                  <>
                    <defs>
                      <clipPath id={`circleClip-${node.id}`}>
                        {/* ROUGH CIRCLE: Replace circle with rough path for clipPath */}
                        <path d={generateRoughCirclePath(0, 0, r, 0.08, 24)} />
                      </clipPath>
                    </defs>

                    {/* ROUGH CIRCLE: Root node with image */}
                    <path
                      d={generateRoughCirclePath(0, 0, r, 0.08, 24)}
                      fill="#fbbf24"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <image
                      href={typeof node.image === 'string' && node.image !== 'null' ? node.image : ''}
                      x={-r}
                      y={-r}
                      width={r * 2}
                      height={r * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#circleClip-${node.id})`}
                    />

                    {/* ROUGH CIRCLE: Overlay circle with transparency */}
                    <path
                      d={generateRoughCirclePath(0, 0, r, 0.08, 24)}
                      fill="rgba(251, 191, 36, 0.2)"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <text
                      x="0"
                      y={r * 0.25}
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

                    <text
                      x="0"
                      y={r * 0.4}
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
                  <>
                    {/* ROUGH CIRCLE: Regular nodes */}
                    <path
                      d={generateRoughCirclePath(0, 0, r, 0.08, 24)}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <foreignObject x={-r} y={-r} width={r * 2} height={r * 2}>
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 select-none overflow-hidden">
                        {node.image && node.image !== 'null' ? (
                          <>
                            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '50%' }}>
                              <img
                                src={node.image}
                                alt={node.name}
                                className="w-full h-full"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center p-1">
                                <div className={`font-black uppercase leading-tight text-center ${isAshramam || isAshramamLeaf || isAshramamAdd || node.isUpdated ? "text-white" : "text-black"}`}
                                  style={{
                                    fontSize: `${Math.max(6, 10 * scaleFactor)}px`,
                                    wordBreak: 'break-word',
                                    maxWidth: '100%'
                                  }}>
                                  {isAshramamLeaf || isAshramamAdd ? node.name : (node.isUpdated ? node.name : t(node.name))}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          isAshramamAdd ? (
                            <UserPlus
                              size={isRoot ? 26 : 20}
                              color="white"
                            />
                          ) : node.isUpdated ? (
                            <User
                              size={isRoot ? 26 : 18}
                              color={isAshramam || isAshramamLeaf || isAshramamAdd ? "white" :
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
                        <div className={`font-black uppercase leading-tight ${isRoot || isAshramam || isAshramamLeaf || isAshramamAdd || node.isUpdated ?
                          "text-white text-[11px]" : "text-black text-[9px]"
                          }`}>
                          {isAshramamLeaf || isAshramamAdd ? node.name : (node.isUpdated ? node.name : t(node.name))}
                        </div>
                      </div>
                    </foreignObject>
                  </>
                )}

                {/* Blinking Red Highlight - ROUGH CIRCLE */}
                {isBlinking && (
                  <path
                    d={generateRoughCirclePath(0, 0, r + 8, 0.2, 14)}
                    fill="none"
                    className="blink-red-circle"
                    style={{ pointerEvents: 'none', strokeOpacity: 1 }}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>

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

            {(() => {
              // 🛑 SAFETY CHECK: If this is last node, NEVER show buttons
              const lastNodeInPath = pathNodes.length > 0 ? pathNodes[pathNodes.length - 1] : null;
              const isLastNode = lastNodeInPath &&
                selectedNode.personId &&
                Number(selectedNode.personId) === Number(lastNodeInPath?.person_id);

              if (isLastNode) {
                console.log("⚠️ Last node reached modal - should not happen, closing");
                setShowModal(false);
                return null;
              }

              const isBlinkingNode = (blinkingNodeId && selectedNode.id === blinkingNodeId) ||
                (blinkingPersonId && selectedNode.personId && Number(selectedNode.personId) === Number(blinkingPersonId));

              if (isBlinkingNode) {
                return (
                  <div className="space-y-3">
                    <button
                      onClick={handleNextFlowerClickForBlinkingNode}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors"
                    >
                      <span className="flex items-center"><Flower2 size={20} className="mr-3" /> {t('nextFlower')}</span>
                      <span>→</span>
                    </button>
                  </div>
                );
              }

              // For regular nodes, show all options
              return (
                <div className="space-y-3">
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

                  <button onClick={() => {
                    setInvitationError(null);
                    setShowPhoneModal(true);
                  }} className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors">
                    <span className="flex items-center"><Phone size={20} className="mr-3" /> {t('connect')}</span>
                    <span>→</span>
                  </button>

                  <button
                    onClick={async () => {
                      if (selectedNode.isUpdated && selectedNode.personId) {
                        try {
                          const response = await genealogyService.getNextFlow(selectedNode.personId);

                          const nextPerson = (response as any).person;
                          const permissions = (response as any).permissions;

                          if (nextPerson) {
                            const personName = (nextPerson.full_name || nextPerson.name || selectedNode.name).toUpperCase();
                            const personGender = nextPerson.gender || 'F';

                            buildNodesFromRelationsForNextFlow(response, personGender, selectedNode.id);

                            fetchGenerationInfo(nextPerson.id);

                            setTransform({
                              x: -selectedNode.position.x * 0.8,
                              y: -selectedNode.position.y * 0.8,
                              scale: 0.8
                            });

                            const path = getPathToNode(selectedNode);
                            const calcRelResult = await calculateRelationFromPath(path);

                            setActiveParentId(selectedNode.id);

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
                        if (selectedNode.relation === 'Ashramam') {
                          expandAshramam(selectedNode.id);
                        } else {
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

                  <button
                    onClick={handleAddPeopleClick}
                    className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl flex items-center justify-between px-5 transition-colors shadow-lg"
                  >
                    <span className="flex items-center">
                      <UserPlus size={20} className="mr-3" /> {t('addPeople')}
                    </span>
                    <span>→</span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </AnimatePresence>

    {/* ============ PATH INFO MODAL (for last node - vasanth) ============ */}
    <AnimatePresence>
      <PathInfoModal />
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

    <AnimatePresence>
      {showAddAshramamModal && selectedNode && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white uppercase">
                  {isTamil ? 'ஆச்ரம உறுப்பினர் சேர்க்க' : 'Add Ashramam Member'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {isTamil ? 'உறவுமுறை மற்றும் பெயரை உள்ளிடவும்' : 'Enter relation and name'}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddAshramamModal(false);
                  setNewAshramamName('');
                  setNewAshramamRelation('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={isSavingAshramamRelative}
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* 1st Relation Field - Editable */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {isTamil ? 'முதல் உறவுமுறை' : '1st Relation'} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="text"
                    value={newAshramamFirstRelation}
                    onChange={(e) => setNewAshramamFirstRelation(e.target.value)}
                    placeholder={isTamil ? 'முதல் உறவுமுறையை உள்ளிடவும்' : 'Enter first relation'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={isSavingAshramamRelative}
                  />
                </div>
              </div>

              {/* 2nd Relation Field */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {isTamil ? 'இரண்டாம் உறவுமுறை' : '2nd Relation'} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="text"
                    value={newAshramamRelation}
                    onChange={(e) => setNewAshramamRelation(e.target.value)}
                    placeholder={isTamil ? 'இரண்டாம் உறவுமுறையை உள்ளிடவும்' : 'Enter second relation'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={isSavingAshramamRelative}
                  />
                </div>
              </div>

              {/* Name Field */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {isTamil ? 'பெயர்' : 'Name'} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="text"
                    value={newAshramamName}
                    onChange={(e) => setNewAshramamName(e.target.value)}
                    placeholder={isTamil ? 'பெயரை உள்ளிடவும்' : 'Enter Name'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    disabled={isSavingAshramamRelative}
                  />
                </div>
              </div>

              {/* Gender Selection */}
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-2">
                  {isTamil ? 'பாலினம்' : 'Gender'} <span className="text-red-400">*</span>
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setNewAshramamGender('M')}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${newAshramamGender === 'M'
                        ? 'border-blue-500 bg-blue-500/20 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    disabled={isSavingAshramamRelative}
                  >
                    <span>{isTamil ? 'ஆண்' : 'Male'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAshramamGender('F')}
                    className={`flex-1 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${newAshramamGender === 'F'
                        ? 'border-pink-500 bg-pink-500/20 text-white'
                        : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}
                    disabled={isSavingAshramamRelative}
                  >
                    <span>{isTamil ? 'பெண்' : 'Female'}</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddAshramamModal(false);
                    setNewAshramamName('');
                    setNewAshramamRelation('');
                    setNewAshramamFirstRelation('');
                  }}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
                  disabled={isSavingAshramamRelative}
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={handleSaveAshramamRelative}
                  disabled={isSavingAshramamRelative || !newAshramamName.trim() || !newAshramamRelation.trim() || !newAshramamFirstRelation.trim()}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingAshramamRelative ? (
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

    <style>{`
    @keyframes nodeBlink {
      0% { transform: scale(1); }
      50% {
        transform: scale(1.25);
        box-shadow: 0 0 30px red;
      }
      100% { transform: scale(1); }
    }

    .blink-node {
      animation: nodeBlink 1s ease-in-out infinite;
    }
    
    @keyframes pulseBlink {
      0% { transform: scale(1); }
      50% {
        transform: scale(1.25);
        box-shadow:0 0 30px red;
      }
      100% { transform: scale(1); }
    }

    .blink-node{
      animation:pulseBlink 1s infinite;
    }
    
    @keyframes blink-red-circle {
      0% { stroke: #ff0000; stroke-width: 8; filter: drop-shadow(0 0 15px rgba(255, 0, 0, 0.8)); }
      50% { stroke: #ff4d4d; stroke-width: 14; filter: drop-shadow(0 0 30px rgba(255, 0, 0, 1)); }
      100% { stroke: #ff0000; stroke-width: 8; filter: drop-shadow(0 0 15px rgba(255, 0, 0, 0.8)); }
    }
    
    .blink-red-circle {
      animation: blink-red-circle 1s infinite ease-in-out;
      stroke: #ff0000;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      pointer-events: none;
    }
    
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px); }
      75% { transform: translateX(2px); }
    }
    
    .animate-shake {
      animation: shake 0.4s ease-in-out 3;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fadeIn {
      animation: fadeIn 0.2s ease-out;
    }
    
    /* Rough hand-drawn circle styles */
    .rough-circle {
      filter: url(#roughness);
    }
    `}</style>
  </div>
);
};

export default GenealogyPage;
