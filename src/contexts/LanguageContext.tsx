import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import React from "react";

type Language = "ta" | "en";

interface Translations {
  [key: string]: {
    ta: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  home: { ta: "முகப்பு", en: "Home" },
  profile: { ta: "சுயவிவரம்", en: "Profile" },
  genealogy: { ta: "கொடி வழி வரைபடம்", en: "Geneology Map" },
  chat: { ta: "அரட்டை", en: "Chat" },
  connections: { ta: "தொடர்புகள்", en: "Connections" },
  login: { ta: "உள்நுழைய", en: "Login" },
  logout: { ta: "வெளியேறு", en: "Logout" },
  kodi: { ta: "கொடி", en: "KODI" },
  language: { ta: "ta", en: "en" },
  services: { ta: "சேவைகள்", en: "Services" },

  // New translations for download and relationship
  download: { ta: "பதிவிறக்கம்", en: "Download" },
  downloadOptions: { ta: "பதிவிறக்க வசதிகள்", en: "Download Options" },
  relationship: { ta: "உறவுமுறை", en: "Relationship" },
  relationshipFinder: { ta: "இருவருக்கான உறவுமுறை", en: "Relationship Finder" },

  logoTagline: {
    ta: "குடும்ப கலாச்சாரத்திற்கு பெயர் பெற்ற இந்தியாவிலிருந்து உலகத்திற்காக இந்த கொடி வலைதளம்.",
    en: "A Family Culture Journey from India to the World – KODI",
  },

  // Hero Content
  familyTreeTitle: {
    ta: "கொடி (மர) வழிவரைபடம்",
    en: "Geneology Roadmap",
  },
  familyTreeContent: {
    ta: "மக அேநகநபக உலெக கி உளன, அைனவ அ ஒ ைமயானஅ பவைதநி சய ெகா . ெகா வழி வவர தி ெதாட ைடய மனதக உற ைறைய ஏ ப தி அத ெபய அவக கடைம, உைம, ெபா ேபா ற நெறா ைறகைள ப ப றி வ வ நெறா ைறகைள ப ப றி வ வ ேபா கலா சார ஆ , உலெக கி இ கலா சார ஆ , உலெக கி இ. கலா சார இ ப உ ைம. மனதன ஆ கால மாறாதைவ,இதெகா வழி. இவைரயலான ெகா வழி வவர உ வா நி வன க பா காதமிக எளைமயான ேகான நம ெகா ெசய தி ட , உ ைம தகவ கைள ெகா உ வா கப நம வைரபட மக நி சய மிகெப ய வ தா எனபதி சேதகமி ைல, ஒ ெவா ேதச தி த வைரபட வைலமதி க யாதெபா கிஷேம.",
    en: "There are many people all over the world, surely it will give everyone a unified experience. The purpose of the lineage is to establish a relationship with the people associated with the lineage and to follow the norms such as duty, rights, and entertainment. It is true that culture is present everywhere. Human desires are unchanging, this is the way of the lineage. There is no doubt that the roadmap we have created with the simplest angle of our flag action plan and true information, which has not been seen by the institutions created so far, will definitely be a huge boon for the people, and the roadmap of every nation is an invaluable treasure.",
  },

  familyTreeMapping: { ta: "கொடிவழி வரைபடம்", en: "Geneology Mapping" },
  familyTreePlatform: {
    ta: "Geneology Mapping Platform",
    en: "Geneology Mapping Platform",
  },
  registerLogin: { ta: "பதிவுசெய்க / உள்நுழைக", en: "Register / Login" },

  // Landing Page Benefits
  benefitsTitle: {
    ta: "கொடிவழி வரைபடம் மூலமாக இணைவதன் நன்மைகள்",
    en: "Benefits of Connecting through Family Tree",
  },
  benefitsSubtitle: {
    ta: "உறவுமுறை கலாச்சாரத்தின் அடிப்படையில் இனம், மொழி, நிறம், மதம், தேசம் போன்ற பாகுபாடுகள் கடந்து ஒன்றினைய முடியும்.",
    en: "Unite beyond race, language, color, lifestyle, and nation through family culture.",
  },
  importantFactors: {
    ta: "உங்கள் குடும்ப வரலாற்றைப் பாதுகாக்கும் முக்கியமான காரணிகள்",
    en: "Important factors in protecting your family history",
  },
  familyConnection: { ta: "குடும்ப இணைப்பு", en: "Family Connection" },
  familyConnectionDesc: {
    ta: "உங்கள் குடும்ப உறுப்பினர்கள் அனைவரையும் ஒரே தளத்தில் இணைக்கவும்.",
    en: "Connect all your family members on a single platform.",
  },
  findingRelations: { ta: "உறவுகளைக் கண்டறிதல்", en: "Finding Relationships" },
  heritageProtection: { ta: "பாரம்பரிய பாதுகாப்பு", en: "Heritage Protection" },
  heritageProtectionDesc: {
    ta: "உங்கள் குடும்பத்தின் பாரம்பரியம், வழக்கங்களை பாதுகாக்கவும்.",
    en: "Protect your family's heritage and traditions.",
  },
  familyHistory: { ta: "குடும்ப வரலாறு", en: "Family History" },
  heritageRecords: { ta: "பாரம்பரிய பதிவுகள்", en: "Heritage Records" },
  documentSecurity: { ta: "ஆவணப் பாதுகாப்பு", en: "Document Security" },
  documentSecurityDesc: {
    ta: "குடும்ப ஆவணங்கள், புகைப்படங்களை பாதுகாப்பாக சேமிக்கவும்.",
    en: "Store family documents and photos securely.",
  },
  importantDocuments: { ta: "முக்கிய ஆவணங்கள்", en: "Important Documents" },
  familyPhotos: { ta: "குடும்ப புகைப்படங்கள்", en: "Family Photos" },
  interactiveDiscovery: {
    ta: "ஊடாடும் கண்டுபிடிப்பு",
    en: "Interactive Discovery",
  },
  visualizeFamily: {
    ta: "தலைமுறைகள் மூலம் உங்கள் குடும்பத்தை பார்க்கவும்",
    en: "Visualize your family through generations.",
  },
  cultureCardTitle: { ta: "கலாச்சாரம்*", en: "Culture*" },
  cultureCardDesc: {
    ta: "நற்பலன்களை அளிக்கும் வகையிலான கொள்கை கோட்டுபாடுகளை வரையறுத்து அதனை கடைப்பிடித்து வாழ்வது. உதாரணமாக ஓர் நிறுவனத்தின் கொள்கைகளை அந்த நிறுவனத்தினர் கடைப்பிடிப்பதினால் அது பல்வேறு நற்பலன்களை அடைந்து முன்னேற்ற பாதையில் பயனிக்கிறது.",
    en: "Defining and living by policy guidelines that provide good benefits. For example, when members of an organization follow its policies, it achieves various benefits and progresses on the path of improvement.",
  },
  companyPolicy: { ta: "நிறுவனக் கொள்கை", en: "Company Policy" },
  growthPath: { ta: "முன்னேற்றப் பாதை", en: "Path of Growth" },

  // Mission
  ourMission: { ta: "நமது குறிக்கோள்", en: "Our Mission" },
  missionTitle: {
    ta: "ஒவ்வொரு குடும்பத்தின் வரலாற்றையும் பாதுகாக்கும் பயணம்",
    en: "A journey to protect every family's history",
  },
  missionDesc: {
    ta: "கொடி திட்டம் மூலம் உங்கள் குடும்பத்தின் முழு வரலாற்றையும் ஒரே இடத்தில் காட்சிப்படுத்தலாம். அடுத்த தலைமுறைகள் தங்கள் வேர்களைப் பற்றி அறிந்து பெருமைப்படுவதை உறுதி செய்கிறோம்.",
    en: "Through the Kodi project, visualize your entire family history in one place. We ensure future generations take pride in their roots.",
  },
  genConnection: { ta: "தலைமுறை இணைப்பு", en: "Generation Connection" },

  // Target
  primaryTarget: { ta: "முதற்கட்ட இலக்கு", en: "Primary Target" },
  memberTarget: {
    ta: "10,000 நபர்களை சேர்க்கும் இலக்கு",
    en: "Member Addition Target",
  },
  targetDescription: {
    ta: '"10,000 நபர்களை அவர்களுடைய உறவுமுறை கலாச்சாரத்தின் அடிப்படையில் ஒன்றினைத்து, பல்வேறு உறவினர்களின் கடமைகள், உரிமைகள், குடும்பநிகழ்ச்சிகளை ஊக்குவிப்பு செய்து பாரம்பரிய பழக்க வழக்கங்களை அடுத்த தலைமுறையினருக்கு டிஜிட்டல் வாயிலாக எடுத்து செல்லும் முயற்சி."',
    en: '"An effort to unite 10,000 individuals based on their kinship culture, encouraging duties, rights, and family events, and passing on traditional customs to the next generation digitally."',
  },
  joinTarget: { ta: "இந்த இலக்கில் சேருங்கள்", en: "Join this Mission" },

  // Footer
  protector: {
    ta: "தென்காசி குடும்ப பாரம்பரிய பாதுகாவலர். உங்கள் வேர்களை பாதுகாப்பதே எங்கள் கடமை.",
    en: "Tenkasi Family Heritage Protector. Protecting your roots is our duty.",
  },
  rights: {
    ta: "அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.",
    en: "All rights reserved.",
  },
  help: { ta: "உதவி தேவை?", en: "Need Help?" },

  // Auth / Login Modal
  loginOtpMessage: {
    ta: "எண்களின் OTP மூலமாக உள்நுழையவும்",
    en: "Login via Mobile OTP",
  },
  adminLogin: { ta: "நிர்வாகி உள்நுழைவு", en: "Admin Login" },
  userLogin: { ta: "பயனர் உள்நுழைவு", en: "User Login" },
  nonSmartPhoneUser: {
    ta: "ஸ்மார்ட் அல்லாத சாதாரண கைபேசி வைத்திருப்பவர்கள்",
    en: "Users with non-smartphone mobile phones",
  },
  webOnlyNotice: {
    ta: "WEB ONLY மூலமாக மென்பொருளை பயன்படுத்தவும்",
    en: "Use the software via WEB ONLY",
  },
  india: { ta: "இந்தியா", en: "India" },
  enterOtpHint: {
    ta: "கைபேசியில் பெறப்பட்ட 6 இலக்க OTP-ஐ உள்ளிடவும்",
    en: "Enter the 6-digit OTP received on your mobile",
  },
  changeNumber: { ta: "எண்ணை மாற்றுக", en: "Change Number" },
  securityNote: {
    ta: "OTP உங்கள் தனிப்பட்ட தகவல். மற்றவர்களுடன் பகிராதீர்கள்",
    en: "OTP is your private information. Do not share with others.",
  },
  acceptTerms: {
    ta: "உள்நுழைவதன் மூலம், கொடியின் பயன்பாட்டு விதிமுறைகள் மற்றும் தனியுரிமைக் கொள்கை ஐ ஏற்கின்றீர்கள்",
    en: "By logging in, you accept the Terms of Use and Privacy Policy",
  },
  terms: { ta: "பயன்பாட்டு விதிமுறைகள்", en: "Terms of Use" },
  and: { ta: "மற்றும்", en: "and" },
  privacyPolicy: { ta: "தனியுரிமைக் கொள்கை", en: "Privacy Policy" },
  adminName: { ta: "நிர்வாகி பெயர்", en: "Admin Name" },
  password: { ta: "கடவுச்சொல்", en: "Password" },
  enterName: { ta: "பெயரை உள்ளிடவும்", en: "Enter name" },
  verifyOtp: { ta: "OTP சரிபார்க்க", en: "Verify OTP" },
  otpSentTo: { ta: "OTP அனுப்பப்பட்டது", en: "OTP sent to" },
  enterSixDigit: {
    ta: "10 இலக்க எண்ணை உள்ளிடவும்",
    en: "Enter 10-digit number",
  },
  changePhone: { ta: "எண்ணை மாற்றுக", en: "Change Number" },

  // Notifications
  otpSuccess: {
    ta: "OTP வெற்றிகரமாக அனுப்பப்பட்டது",
    en: "OTP sent successfully",
  },
  otpResendSuccess: {
    ta: "புதிய OTP வெற்றிகரமாக அனுப்பப்பட்டது",
    en: "New OTP sent successfully",
  },
  adminLoginSuccess: {
    ta: "நிர்வாகி உள்நுழைவு வெற்றி",
    en: "Admin login successful",
  },
  adminLoginError: {
    ta: "நிர்வாகி உள்நுழைவு தோல்வியடைந்தது",
    en: "Admin login failed",
  },
  invalidOtp: {
    ta: "தவறான OTP. மீண்டும் முயற்சிக்கவும்",
    en: "Invalid OTP. Try again.",
  },
  otpLengthError: { ta: "6 இலக்க OTP ஐ உள்ளிடவும்", en: "Enter 6 digit OTP" },
  phoneLengthError: {
    ta: "சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்",
    en: "Enter a valid 10-digit mobile number",
  },
  otpFailure: {
    ta: "OTP அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்",
    en: "Could not send OTP. Try again.",
  },
  allDetailsError: {
    ta: "அனைத்து விவரங்களையும் உள்ளிடவும்",
    en: "Please enter all details",
  },

  // Mobile Number
  mobileNumber: { ta: "கைபேசி எண்", en: "Mobile Number" },
  enterMobile: { ta: "கைபேசி எண்ணை உள்ளிடவும்", en: "Enter mobile number" },
  continue: { ta: "தொடரவும்", en: "Continue" },
  enterOtp: { ta: "OTP ஐ உள்ளிடவும்", en: "Enter OTP" },
  verify: { ta: "சரிபார்க்கவும்", en: "Verify" },
  resendOtp: { ta: "OTP மீண்டும் அனுப்பு", en: "Resend OTP" },
  otpSent: { ta: "OTP அனுப்பப்பட்டது", en: "OTP sent to" },

  // Profile
  firstName: { ta: "முதல் பெயர்", en: "First Name" },
  secondName: { ta: "இரண்டாம் பெயர்", en: "Second Name" },
  thirdName: { ta: "மூன்றாம் பெயர்", en: "Third Name" },
  fatherName: { ta: "தந்தை பெயர்", en: "Father's Name" },
  motherName: { ta: "தாய் பெயர்", en: "Mother's Name" },
  gender: { ta: "பாலினம்", en: "Gender" },
  male: { ta: "ஆண்", en: "Male" },
  female: { ta: "பெண்", en: "Female" },
  other: { ta: "மற்றவை", en: "Other" },
  dateOfBirth: { ta: "பிறந்த தேதி", en: "Date of Birth" },
  age: { ta: "வயது", en: "Age" },
  save: { ta: "சேமிக்கவும்", en: "Save" },
  cancel: { ta: "ரத்து செய்", en: "Cancel" },

  // Posts
  whatsOnMind: { ta: "உங்கள் எண்ணம் என்ன?", en: "What's on your mind?" },
  post: { ta: "பதிவிடு", en: "Post" },
  like: { ta: "விரும்பு", en: "Like" },
  comment: { ta: "கருத்து", en: "Comment" },
  share: { ta: "பகிர்", en: "Share" },
  writeComment: { ta: "கருத்து எழுதுங்கள்...", en: "Write a comment..." },

  // Chat
  startChat: { ta: "அரட்டை தொடங்கு", en: "Start Chat" },
  typeMessage: { ta: "செய்தி எழுதுங்கள்...", en: "Type a message..." },
  send: { ta: "அனுப்பு", en: "Send" },
  online: { ta: "ஆன்லைன்", en: "Online" },
  offline: { ta: "ஆஃப்லைன்", en: "Offline" },

  // Connections
  addFamilyMember: { ta: "குடும்ப உறுப்பினரைச் சேர்", en: "Add Family Member" },
  accept: { ta: "ஏற்கவும்", en: "Accept" },
  reject: { ta: "நிராகரி", en: "Reject" },
  pending: { ta: "நிலுவையில்", en: "Pending" },
  Relatives: { ta: "உறவினர்கள்", en: "Relatives" },
  requests: { ta: "கோரிக்கைகள்", en: "Requests" },
  familyMembers: { ta: "குடும்ப உறுப்பினர்கள்", en: "Family Members" },
  accepted: { ta: "ஏற்கப்பட்டது", en: "Accepted" },
  rejected: { ta: "நிராகரிக்கப்பட்டது", en: "Rejected" },
  cancelled: { ta: "ரத்து செய்யப்பட்டது", en: "Cancelled" },
  expired: { ta: "காலாவதியானது", en: "Expired" },
  view: { ta: "காண்க", en: "View" },
  details: { ta: "விவரங்கள்", en: "Details" },
  you: { ta: "நீங்கள்", en: "You" },
  backToMyConnections: {
    ta: "எனது உறவுகளுக்குத் திரும்பு",
    en: "Back to my connections",
  },

  // Common
  loading: { ta: "ஏற்றுகிறது...", en: "Loading..." },
  error: { ta: "பிழை", en: "Error" },
  success: { ta: "வெற்றி", en: "Success" },
  delete: { ta: "நீக்கு", en: "Delete" },
  edit: { ta: "திருத்து", en: "Edit" },
  search: { ta: "தேடு", en: "Search" },
  upload: { ta: "பதிவேற்று", en: "Upload" },
  privacy: { ta: "தனியுரிமை", en: "Privacy" },
  termsLink: { ta: "விதிமுறைகள்", en: "Terms" },
  cookies: { ta: "குக்கீகள்", en: "Cookies" },

  // Kinship Terms
  Father: { ta: "தந்தை", en: "Father" },
  Mother: { ta: "தாய்", en: "Mother" },
  "Elder Brother": { ta: "அண்ணன்", en: "Elder Brother" },
  "Elder Sister": { ta: "அக்கா", en: "Elder Sister" },
  "Younger Brother": { ta: "தம்பி", en: "Younger Brother" },
  "Younger Sister": { ta: "தங்கை", en: "Younger Sister" },
  Son: { ta: "மகன்", en: "Son" },
  Daughter: { ta: "மகள்", en: "Daughter" },
  Husband: { ta: "கணவர்", en: "Husband" },
  Wife: { ta: "மனைவி", en: "Wife" },
  Ashramam: { ta: "ஆசிரமம்", en: "Ashramam" },
  "Ashramam Member": { ta: "ஆசிரம உறுப்பினர்", en: "Ashramam Member" },
  Brother: { ta: "சகோதரர்", en: "Brother" },
  Sister: { ta: "சகோதரி", en: "Sister" },
  Self: { ta: "நீங்கள்", en: "Self" },

  // Dashboard
  totalMembers: { ta: "மொத்த உறுப்பினர்கள்", en: "Total Members" },
  newJoinees: { ta: "புதிய சேர்க்கைகள்", en: "New Joinees" },
  activeSessions: { ta: "செயலில் உள்ள அமர்வுகள்", en: "Active Sessions" },
  growthRate: { ta: "வளர்ச்சி விகிதம்", en: "Growth Rate" },
  adminPanel: { ta: "நிர்வாகக் குழு", en: "Admin Panel" },
  overview: { ta: "மேலோட்டம்", en: "Overview" },
  userManagement: { ta: "பயனர் மேலாண்மை", en: "User Management" },
  analytics: { ta: "பகுப்பாய்வு", en: "Analytics" },
  adminDashboard: { ta: "நிர்வாகி டாஷ்போர்டு", en: "Administrator Dashboard" },
  monitorMembers: {
    ta: "அனைத்து உறுப்பினர்களையும் கண்காணிக்கவும் நிர்வகிக்கவும்",
    en: "Monitor and manage all family members",
  },
  searchUsers: { ta: "பயனர்களைத் தேடு...", en: "Search users..." },
  export: { ta: "ஏற்றுமதி", en: "Export" },
  user: { ta: "பயனர்", en: "User" },
  mobile: { ta: "கைபேசி", en: "Mobile" },
  status: { ta: "நிலை", en: "Status" },
  joinDate: { ta: "சேர்ந்த தேதி", en: "Join Date" },
  action: { ta: "செயல்", en: "Action" },
  showing: { ta: "காட்டுகிறது", en: "Showing" },
  of: { ta: "இல்", en: "of" },
  previous: { ta: "முந்தைய", en: "Previous" },
  next: { ta: "அடுத்தது", en: "Next" },
  activeStatus: { ta: "செயலில்", en: "Active" },
  offlineStatus: { ta: "ஆஃப்லைன்", en: "Offline" },

  // Genealogy Modals
  editName: { ta: "பெயர் திருத்து", en: "Edit Name" },
  connect: { ta: "இணைக்கவும்", en: "Connect" },
  nextFlower: { ta: "அடுத்த மலர்", en: "Next Flower" },
  addPeople: { ta: "நபர்களைச் சேர்", en: "Add People" },
  newName: { ta: "புதிய பெயர்", en: "New Name" },
  enterNewName: { ta: "புதிய பெயரை உள்ளிடவும்", en: "Enter new name" },
  invitationSent: {
    ta: "அழைப்பு அனுப்பப்பட்டது!",
    en: "Invitation sent successfully!",
  },
  sendInvitationTitle: { ta: "அழைப்பு அனுப்பவும்", en: "Send Invitation" },
  inviteToJoin: { ta: "இணைய அழைக்கவும்", en: "Invite to join" },

  // Profile Page
  profileTitle: { ta: "சுயவிவரம்", en: "Profile" },
  profileSubtitle: { ta: "சுயவிவர விவரங்கள்", en: "Profile Details" },
  goToGenealogy: { ta: "கொடிவழி வரைபடம் செல்லவும்", en: "Go to Geneology Map" },
  step1Public: {
    ta: "படி 1 - பகிரங்க விவரங்கள்",
    en: "Step 1 - Public Details",
  },
  step2Private: {
    ta: "படி 2 - தனிப்பட்ட விவரங்கள்",
    en: "Step 2 - Private Details",
  },
  step3Cultural: {
    ta: "படி 3 - கலாச்சார விவரங்கள்",
    en: "Step 3 - Cultural Details",
  },
  native: { ta: "சொந்த ஊர்", en: "Native" },
  presentCity: { ta: "தற்போதைய நகரம்", en: "Present City" },
  taluk: { ta: "தாலுகா", en: "Taluk" },
  district: { ta: "மாவட்டம்", en: "District" },
  state: { ta: "மாநிலம்", en: "State" },
  contactNumber: { ta: "தொடர்பு எண்", en: "Contact Number" },
  nationality: { ta: "தேசியம்", en: "Nationality" },
  cultureOfLife: { ta: "வாழ்க்கை முறை", en: "Culture of Life" },
  preferredLanguage: { ta: "தாய்மொழி", en: "Preferred Language" },
  saving: { ta: "சேமிக்கிறது...", en: "Saving..." },
  firstnameError: { ta: "முதல் பெயர் தேவை", en: "First Name is required" },
  profileLoadError: {
    ta: "சுயவிவரத்தை ஏற்ற முடியவில்லை",
    en: "Could not load profile",
  },
  profileSaveSuccess: {
    ta: "சுயவிவரம் வெற்றிகரமாகச் சேமிக்கப்பட்டது!",
    en: "Profile saved successfully!",
  },
  selectGender: { ta: "பாலினம் தேர்ந்தெடுக்கவும்", en: "Select Gender" },
  selectLanguage: { ta: "மொழி தேர்ந்தெடுக்கவும்", en: "Select Language" },
  userName: { ta: "பயனாளர் பெயர்", en: "User Name" },

  // Next Flower Modal
  nextFlowerFor: { ta: "அடுத்த மலர் - ", en: "Next Flower - " },
  existingConnections: {
    ta: "தற்போதுள்ள இணைப்புகள்",
    en: "Existing Connections",
  },
  addNewFamilyMember: {
    ta: "புதிய குடும்ப உறுப்பினரைச் சேர்க்கவும்",
    en: "Add New Family Member",
  },
  enterNameFor: { ta: "பெயரை உள்ளிடவும்: ", en: "Enter Name for " },
  addPerson: { ta: "நபரைச் சேர்", en: "Add Person" },
  placeholderNote: {
    ta: "இது ஒரு மாதிரி நபர். இவருக்கு உறவினர்களைச் சேர்ப்பதன் மூலம் குடும்ப மரத்தை உருவாக்கலாம்.",
    en: "This is a placeholder person. Add relatives to build their family tree.",
  },
  readyToAddNote: {
    ta: "குடும்ப உறுப்பினர்களைச் சேர்க்கத் தயார்",
    en: "Ready to add family members",
  },
  loadingOptions: {
    ta: "விருப்பங்கள் ஏற்றப்படுகின்றன...",
    en: "Loading options...",
  },

  // ConnectedPeople translations
  connectedPeoples: { ta: "இணைக்கப்பட்ட உறவுகள்", en: "Connected People" },
  manageConnectionsSub: {
    ta: "உங்கள் குடும்ப தொடர்புகள் மற்றும் அழைப்புகளை தொழில்முறை ரீதியாக நிர்வகிக்கவும்",
    en: "Manage your family connections and invitations professionally",
  },
  connectionError: { ta: "இணைப்பு பிழை", en: "Connection Error" },
  noRelativesYet: { ta: "இன்னும் உறவினர்கள் இல்லை", en: "No Relatives Yet" },
  startAddingFirst: {
    ta: "உங்கள் குடும்ப மரம் வளர காத்திருக்கிறது! அவற்றைப் பார்க்க உங்கள் முதல் உறவினரைச் சேர்ப்பதன் மூலம் தொடங்கவும்.",
    en: "Your family tree is waiting to grow! Start by adding your first relative to see them here.",
  },
  viewDetails: { ta: "விவரங்களைக் காண்க", en: "View Details" },
  recipientMobileNumber: {
    ta: "பெறுநரின் கைபேசி எண்",
    en: "Recipient Mobile Number",
  },
  processing: { ta: "செயலாக்கப்படுகிறது...", en: "Processing..." },
  sendSecureInvitation: {
    ta: "பாதுகாப்பான அழைப்பை அனுப்பு",
    en: "Send Secure Invitation",
  },
  goBack: { ta: "பின்செல்", en: "Go Back" },
  invitationSuccess: {
    ta: "அழைப்பு வெற்றிகரமாக அனுப்பப்பட்டது",
    en: "Invitation success",
  },
  validTenDigitError: {
    ta: "சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்",
    en: "Please enter a valid 10-digit mobile number",
  },
  validPrefixError: {
    ta: "6-9 இல் தொடங்கும் சரியான கைபேசி எண்ணை உள்ளிடவும்",
    en: "Please enter a valid mobile number starting with 6-9",
  },
  invitationNote: {
    ta: "இந்த எண்ணிற்கு ஒரு அழைப்பு இணைப்பு அனுப்பப்படும்",
    en: "An invitation link will be sent to this number",
  },
  connectedLabel: { ta: "இணைக்கப்பட்டுள்ளது", en: "connected" },
  totalLabel: { ta: "மொத்தம்", en: "total" },
  reconnect: { ta: "மீண்டும் இணைக்கவும்", en: "Try Reconnecting" },
  memberNetworkAccess: {
    ta: "உறுப்பினர் இணைய அணுகல்",
    en: "Member Network Access",
  },
  noRelativesFound: {
    ta: "உறவினர்கள் யாரும் காணப்படவில்லை",
    en: "No relatives found",
  },
  startAddingPeople: {
    ta: "அவற்றைப் பார்க்க இந்த வகையிலான நபர்களைச் சேர்க்கத் தொடங்கவும்.",
    en: "Start adding people to this category to see them here.",
  },
  connectedStatus: { ta: "இணைக்கப்பட்டுள்ளது", en: "Connected" },
  pendingStatus: { ta: "நிலுவையில்", en: "Pending" },
  tenDigitPlaceholder: {
    ta: "பத்து இலக்க கைபேசி எண்",
    en: "Ten-digit mobile number",
  },
  inviteBtn: { ta: "அழைப்பு", en: "Invite" },

  // Kinship Codes
  FATHER: { ta: "தந்தை", en: "Father" },
  MOTHER: { ta: "தாய்", en: "Mother" },
  ELDER_BROTHER: { ta: "அண்ணன்", en: "Elder Brother" },
  ELDER_SISTER: { ta: "அக்காள்", en: "Elder Sister" },
  YOUNGER_BROTHER: { ta: "தம்பி", en: "Younger Brother" },
  YOUNGER_SISTER: { ta: "தங்கை", en: "Younger Sister" },
  SON: { ta: "மகன்", en: "Son" },
  DAUGHTER: { ta: "மகள்", en: "Daughter" },
  HUSBAND: { ta: "கணவர்", en: "Husband" },
  WIFE: { ta: "மனைவி", en: "Wife" },
  ASHRAMAM: { ta: "ஆசிரமம்", en: "Ashramam" },
  BROTHER: { ta: "சகோதரர்", en: "Brother" },
  SISTER: { ta: "சகோதரி", en: "Sister" },

  // Category Codes
  primary_line: { ta: "முதன்மை வழி", en: "Primary Line" },
  secondary_line: { ta: "இரண்டாம் வழி", en: "Secondary Line" },
  extended_line: { ta: "விரிவாக்கப்பட்ட வழி", en: "Extended Line" },
  immediate_family: { ta: "உடனடி குடும்பம்", en: "Immediate Family" },

  // Chat Page Additional
  searchConversations: { ta: "உரையாடல்களைத் தேடுக...", en: "Search conversations..." },
  noMessages: { ta: "இன்னும் செய்திகள் இல்லை", en: "No messages yet" },
  untitledGroup: { ta: "பெயரிடப்படாத குழு", en: "Untitled Group" },
  unknownUser: { ta: "தெரியாத பயனர்", en: "Unknown User" },
  startNewChat: { ta: "புதிய அரட்டையைத் தொடங்கு", en: "Start New Chat" },
  selectConversation: { ta: "செய்தி அனுப்ப உரையாடலைத் தேர்ந்தெடுக்கவும்", en: "Select a conversation to start messaging" },
  changeName: { ta: "பெயரை மாற்றவும்", en: "Change Name" },
  blockUser: { ta: "பயனரை முடக்கு", en: "Block User" },
  unblockUser: { ta: "பயனரை விடுவி", en: "Unblock User" },
  addMember: { ta: "உறுப்பினரைச் சேர்", en: "Add Member" },
  viewMember: { ta: "உறுப்பினரைப் பார்", en: "View Member" },
  exitGroup: { ta: "குழுவிலிருந்து வெளியேறு", en: "Exit Group" },
  clearChat: { ta: "அரட்டையை அழி", en: "Clear Chat" },
  addGroupMember: { ta: "குழு உறுப்பினரைச் சேர்க்கவும்", en: "Add Group Member" },
  enterMobileNumber: { ta: "கைபேசி எண்ணை உள்ளிடவும்", en: "Enter mobile number" },
  clearChatConfirm: { ta: "அரட்டையை அழிக்கவா?", en: "Clear Chat?" },
  clearChatDesc: { ta: "இந்த உரையாடலில் உள்ள அனைத்து செய்திகளையும் இது நிரந்தரமாக அகற்றும். இந்தச் செயலை மாற்ற முடியாது.", en: "This will permanently remove all messages from this conversation. This action cannot be undone." },
  deleteMessageConfirm: { ta: "செய்தியை நீக்கவா?", en: "Delete message?" },
  deleteMessageDesc: { ta: "இந்தச் செய்தியை நீக்க விரும்புகிறீர்களா? இந்தச் செயலை மாற்ற முடியாது.", en: "Are you sure you want to delete this message? This action cannot be undone." },
  setNickname: { ta: "புனைப்பெயரை அமைக்கவும்", en: "Set Nickname" },
  enterNickname: { ta: "தொடர்பு புனைப்பெயரை உள்ளிடவும்", en: "Enter contact nickname" },
  direct: { ta: "நேரடி", en: "Direct" },
  group: { ta: "குழு", en: "Group" },
  groupName: { ta: "குழு பெயர்", en: "Group Name" },
  enterMobileNumbers: { ta: "கைபேசி எண்களை உள்ளிடவும்", en: "Enter mobile numbers" },
  createGroup: { ta: "குழுவை உருவாக்கு", en: "Create Group" },
  blockedUsers: { ta: "முடக்கப்பட்ட பயனர்கள்", en: "Blocked Users" },
  noBlockedUsers: { ta: "முடக்கப்பட்ட பயனர்கள் யாரும் இல்லை.", en: "No blocked users." },
  groupMembers: { ta: "குழு உறுப்பினர்கள்", en: "Group Members" },
  admin: { ta: "நிர்வாகி", en: "Admin" },
  remove: { ta: "நீக்கு", en: "Remove" },
  loadingMembers: { ta: "உறுப்பினர்களை ஏற்றுகிறது...", en: "Loading members..." },
  noMembersFound: { ta: "உறுப்பினர்கள் யாரும் இல்லை", en: "No members found" },
  exitGroupConfirm: { ta: "குழுவிலிருந்து வெளியேறவா?", en: "Exit Group?" },
  exitGroupDesc: { ta: "நிச்சயமாக இந்தக் குழுவிலிருந்து வெளியேற விரும்புகிறீர்களா? மீண்டும் சேர நீங்கள் அழைக்கப்பட வேண்டும்.", en: "Are you sure you want to exit this group? You will need to be added again to rejoin." },
  typing: { ta: "தட்டச்சு செய்கிறார்...", en: "typing..." },
  peopleTyping: { ta: "நபர்கள் தட்டச்சு செய்கிறார்கள்...", en: "people typing..." },
  messageUpdated: { ta: "செய்தி புதுப்பிக்கப்பட்டது", en: "Message updated" },
  messageDeleted: { ta: "செய்தி வெற்றிகரமாக நீக்கப்பட்டது", en: "Message deleted successfully" },
  failedDeleteMessage: { ta: "செய்தியை நீக்க முடியவில்லை", en: "Failed to delete message" },
  exitedGroup: { ta: "குழுவிலிருந்து வெற்றிகரமாக வெளியேறினீர்கள்", en: "Exited group successfully" },
  failedExitGroup: { ta: "குழுவிலிருந்து வெளியேற முடியவில்லை", en: "Failed to exit group" },
  memberAdded: { ta: "உறுப்பினர் வெற்றிகரமாக சேர்க்கப்பட்டார்", en: "Member added successfully" },
  userNotFoundMobile: { ta: "பயனர் கிடைக்கவில்லை தயவுசெய்து சரியான கைபேசி எண்ணை உள்ளிடவும்", en: "user not found please enter correct moble no" },
  failedAddMember: { ta: "உறுப்பினரைச் சேர்க்க முடியவில்லை", en: "Failed to add member" },
  memberRemoved: { ta: "உறுப்பினர் வெற்றிகரமாக நீக்கப்பட்டார்", en: "Member removed successfully" },
  failedRemoveMember: { ta: "உறுப்பினரை நீக்க முடியவில்லை", en: "Failed to remove member" },
  nicknameUpdated: { ta: "புனைப்பெயர் புதுப்பிக்கப்பட்டது", en: "Nickname updated" },
  failedUpdateName: { ta: "பெயரைப் புதுப்பிக்க முடியவில்லை", en: "Failed to update name" },
  chatCleared: { ta: "அரட்டை வெற்றிகரமாக அழிக்கப்பட்டது", en: "Chat cleared successfully" },
  failedClearChat: { ta: "அரட்டையை அழிக்க முடியவில்லை", en: "Failed to clear chat" },
  pleaseEnterMobile: { ta: "கைபேசி எண்ணை உள்ளிடவும்", en: "Please enter mobile number" },
  failedCreateChat: { ta: "நேரடி அரட்டையை உருவாக்க முடியவில்லை", en: "Failed to create direct chat." },
  groupCreateError: { ta: "குழுவை உருவாக்குவதில் பிழை. விவரங்களைச் சரிபார்க்கவும்.", en: "Failed to create group. Check the participant details." },
  failedLoadMessages: { ta: "செய்திகளை ஏற்ற முடியவில்லை", en: "Failed to load messages" },
  failedLoadConversations: { ta: "உரையாடல்களை ஏற்ற முடியவில்லை", en: "Failed to load conversations" },
  youHaveBlocked: { ta: "நீங்கள் இந்தப் பயனரை முடக்கியுள்ளீர்கள்.", en: "You have blocked this user." },
  cannotReply: { ta: "இந்த உரையாடலில் உங்களால் பதிலளிக்க முடியாது.", en: "You cannot reply to this conversation." },
  all: { ta: "அனைத்தும்", en: "ALL" },
  justNow: { ta: "இப்பொழுது", en: "just now" },
  pathInfoMissing: { ta: "பாதை தகவல் இல்லை", en: "Path information missing" },
  failedLoadConnected: { ta: "இணைக்கப்பட்ட நபரை ஏற்ற முடியவில்லை", en: "Failed to load connected person" },
  cannotFindParent: { ta: "பெற்றோர் நபரைத் தேட முடியவில்லை. மீண்டும் முயற்சிக்கவும்.", en: "Cannot find parent person. Please try again." },
  failedAddPerson: { ta: "நபரைச் சேர்க்க முடியவில்லை", en: "Failed to add person" },
  invalidMobileLength: { ta: "சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்", en: "Please enter a valid 10 digit mobile number" },
  invalidMobilePrefix: { ta: "6, 7, 8, அல்லது 9 இல் தொடங்கும் சரியான இந்திய கைபேசி எண்ணை உள்ளிடவும்", en: "Please enter a valid Indian mobile number starting with 6, 7, 8, or 9" },
  cannotFindPersonInfo: { ta: "சரியான நபர் தகவலைக் கண்டறிய முடியவில்லை. முதலில் பெயரைச் சேமிக்கவும்.", en: "Cannot find valid person information. Please save the name first." },
  invalidPersonInfo: { ta: "தவறான நபர் தகவல். நபர் இன்னும் சேமிக்கப்படாமல் இருக்கலாம்.", en: "Invalid person information. The person may not be saved yet." },
  personNotFoundSaveFirst: { ta: "நபர் கிடைக்கவில்லை. அழைப்பை அனுப்பும் முன் பெயரைச் சேமிக்கவும்.", en: "Person not found. Please save the name first before sending invitation." },
  unblockedSuccess: { ta: "விடுவிக்கப்பட்டது", en: "unblocked successfully" },
  blockedSuccess: { ta: "முடக்கப்பட்டது", en: "blocked successfully" },
  failedBlock: { ta: "முடக்க/விடுவிக்க முடியவில்லை", en: "Failed to block/unblock user" },
  selectBothPeople: { ta: "இருவரையும் தேர்ந்தெடுக்கவும்", en: "Please select both people" },
  bothSamePerson: { ta: "இருவரும் ஒரே நபர்", en: "Both people are the same" },
  noRelationshipFound: { ta: "உறவுமுறை கண்டறியப்படவில்லை", en: "No relationship found" },
  couldNotFindPath: { ta: "உறவுமுறை கண்டறிய முடியவில்லை", en: "Could not find relationship path" },
  invitationSentTo: { ta: "அழைப்பு வெற்றிகரமாக அனுப்பப்பட்டது", en: "Invitation sent successfully to" },
  invitationSentTitle: { ta: "அழைப்பு அனுப்பப்பட்டது!", en: "Invitation Sent!" },
  invitationSentDesc: { ta: "அழைப்பு வெற்றிகரமாக அனுப்பப்பட்டது", en: "Invitation has been sent successfully" },
  closingAutomatically: { ta: "3 வினாடிகளில் தானாகவே மூடப்படும்...", en: "Closing automatically in 3 seconds..." },
  actionRequired: { ta: "நடவடிக்கை தேவை", en: "Action Required" },
  userNeedsAccept: { ta: "இணைக்க பயனர் உங்கள் அழைப்பை ஏற்க வேண்டும்.", en: "The user needs to accept your invitation to connect." },
  existingUser: { ta: "ஏற்கனவே உள்ள பயனர்", en: "Existing User" },
  newUser: { ta: "புதிய பயனர்", en: "New User" },
  mobileNumberRequired: { ta: "கைபேசி எண் தேவை", en: "Mobile number is required" },
  invitationAccepted: { ta: "✅ அழைப்பு ஏற்கப்பட்டது", en: "✅ Invitation accepted" },
  failedAccept: { ta: "❌ ஏற்பதில் பிழை", en: "❌ Failed to accept" },
  invitationRejected: { ta: "✅ அழைப்பு நிராகரிக்கப்பட்டது", en: "✅ Invitation rejected" },
  failedReject: { ta: "❌ நிராகரிப்பதில் பிழை", en: "❌ Failed to reject" },
  invitationCancelled: { ta: "✅ அழைப்பு ரத்து செய்யப்பட்டது", en: "✅ Invitation cancelled" },
  failedCancel: { ta: "❌ ரத்து செய்வதில் பிழை", en: "❌ Failed to cancel" },
  failedLoadDetails: { ta: "❌ விவரங்களை ஏற்ற முடியவில்லை", en: "❌ Failed to load details" },
  allNotifications: { ta: "அனைத்து அறிவிப்புகள்", en: "All Notifications" },
  noNotifications: { ta: "அறிவிப்புகள் எதுவுமில்லை", en: "No notifications found" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "ta";
  });

  // Log language changes
  useEffect(() => {
    console.log("LanguageContext: Current language changed to", language);
  }, [language]);

  const handleSetLanguage = (lang: Language) => {
    console.log("LanguageContext: Setting language to", lang);
    setLanguage(lang);
    localStorage.setItem("language", lang);
    console.log("LanguageContext: Language saved to localStorage");
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage: handleSetLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
