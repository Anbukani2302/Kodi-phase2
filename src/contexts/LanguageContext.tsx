import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import React from 'react';

type Language = 'ta' | 'en';

interface Translations {
  [key: string]: {
    ta: string;
    en: string;
  };
}

const translations: Translations = {
  // Navigation
  home: { ta: 'முகப்பு', en: 'Home' },
  profile: { ta: 'சுயவிவரம்', en: 'Profile' },
  genealogy: { ta: 'கொடி வழி வரைபடம்', en: 'Geneology Map' },
  chat: { ta: 'அரட்டை', en: 'Chat' },
  connections: { ta: 'தொடர்புகள்', en: 'Connections' },
  login: { ta: 'உள்நுழைய', en: 'Login' },
  logout: { ta: 'வெளியேறு', en: 'Logout' },
  kodi: { ta: 'கொடி', en: 'KODI' },
  language: { ta: 'ta', en: 'en' },
  services: { ta: 'சேவைகள்', en: 'Services' },

  // New translations for download and relationship
  download: { ta: 'பதிவிறக்கம்', en: 'Download' },
  downloadOptions: { ta: 'பதிவிறக்க வசதிகள்', en: 'Download Options' },
  relationship: { ta: 'உறவுமுறை', en: 'Relationship' },
  relationshipFinder: { ta: 'இருவருக்கான உறவுமுறை', en: 'Relationship Finder' },

  logoTagline: {
    ta: 'குடும்ப கலாச்சாரத்திற்கு பெயர் பெற்ற இந்தியாவிலிருந்து உலகத்திற்காக இந்த கொடி வலைதளம்.',
    en: 'A Family Culture Journey from India to the World – KODI'
  },

  // Hero Content
  familyTreeTitle: {
    ta: 'கொடி (மர) வழிவரைபடம்',
    en: 'Geneology Roadmap'
  },
  familyTreeContent: {
    ta: 'மக அேநகநபக உலெக கி உளன, அைனவ அ ஒ ைமயானஅ பவைதநி சய ெகா . ெகா வழி வவர தி ெதாட ைடய மனதக உற ைறைய ஏ ப தி அத ெபய அவக கடைம, உைம, ெபா ேபா ற நெறா ைறகைள ப ப றி வ வ நெறா ைறகைள ப ப றி வ வ ேபா கலா சார ஆ , உலெக கி இ கலா சார ஆ , உலெக கி இ. கலா சார இ ப உ ைம. மனதன ஆ கால மாறாதைவ,இதெகா வழி. இவைரயலான ெகா வழி வவர உ வா நி வன க பா காதமிக எளைமயான ேகான நம ெகா ெசய தி ட , உ ைம தகவ கைள ெகா உ வா கப நம வைரபட மக நி சய மிகெப ய வ தா எனபதி சேதகமி ைல, ஒ ெவா ேதச தி த வைரபட வைலமதி க யாதெபா கிஷேம.',
    en: 'There are many people all over the world, surely it will give everyone a unified experience. The purpose of the lineage is to establish a relationship with the people associated with the lineage and to follow the norms such as duty, rights, and entertainment. It is true that culture is present everywhere. Human desires are unchanging, this is the way of the lineage. There is no doubt that the roadmap we have created with the simplest angle of our flag action plan and true information, which has not been seen by the institutions created so far, will definitely be a huge boon for the people, and the roadmap of every nation is an invaluable treasure.'
  },

  familyTreeMapping: { ta: 'கொடிவழி வரைபடம்', en: 'Geneology Mapping' },
  familyTreePlatform: { ta: 'Geneology Mapping Platform', en: 'Geneology Mapping Platform' },
  registerLogin: { ta: 'பதிவுசெய்க / உள்நுழைக', en: 'Register / Login' },

  // Landing Page Benefits
  benefitsTitle: { ta: 'கொடிவழி வரைபடம் மூலமாக இணைவதன் நன்மைகள்', en: 'Benefits of Connecting through Family Tree' },
  benefitsSubtitle: { ta: 'உறவுமுறை கலாச்சாரத்தின் அடிப்படையில் இனம், மொழி, நிறம், மதம், தேசம் போன்ற பாகுபாடுகள் கடந்து ஒன்றினைய முடியும்.', en: 'Unite beyond race, language, color, religion, and nation through family culture.' },
  importantFactors: { ta: 'உங்கள் குடும்ப வரலாற்றைப் பாதுகாக்கும் முக்கியமான காரணிகள்', en: 'Important factors in protecting your family history' },
  familyConnection: { ta: 'குடும்ப இணைப்பு', en: 'Family Connection' },
  familyConnectionDesc: { ta: 'உங்கள் குடும்ப உறுப்பினர்கள் அனைவரையும் ஒரே தளத்தில் இணைக்கவும்.', en: 'Connect all your family members on a single platform.' },
  findingRelations: { ta: 'உறவுகளைக் கண்டறிதல்', en: 'Finding Relationships' },
  heritageProtection: { ta: 'பாரம்பரிய பாதுகாப்பு', en: 'Heritage Protection' },
  heritageProtectionDesc: { ta: 'உங்கள் குடும்பத்தின் பாரம்பரியம், வழக்கங்களை பாதுகாக்கவும்.', en: "Protect your family's heritage and traditions." },
  familyHistory: { ta: 'குடும்ப வரலாறு', en: 'Family History' },
  heritageRecords: { ta: 'பாரம்பரிய பதிவுகள்', en: 'Heritage Records' },
  documentSecurity: { ta: 'ஆவணப் பாதுகாப்பு', en: 'Document Security' },
  documentSecurityDesc: { ta: 'குடும்ப ஆவணங்கள், புகைப்படங்களை பாதுகாப்பாக சேமிக்கவும்.', en: 'Store family documents and photos securely.' },
  importantDocuments: { ta: 'முக்கிய ஆவணங்கள்', en: 'Important Documents' },
  familyPhotos: { ta: 'குடும்ப புகைப்படங்கள்', en: 'Family Photos' },
  interactiveDiscovery: { ta: 'ஊடாடும் கண்டுபிடிப்பு', en: 'Interactive Discovery' },
  visualizeFamily: { ta: 'தலைமுறைகள் மூலம் உங்கள் குடும்பத்தை பார்க்கவும்', en: 'Visualize your family through generations.' },
  cultureCardTitle: { ta: 'கலாச்சாரம்*', en: 'Culture*' },
  cultureCardDesc: {
    ta: 'நற்பலன்களை அளிக்கும் வகையிலான கொள்கை கோட்டுபாடுகளை வரையறுத்து அதனை கடைப்பிடித்து வாழ்வது. உதாரணமாக ஓர் நிறுவனத்தின் கொள்கைகளை அந்த நிறுவனத்தினர் கடைப்பிடிப்பதினால் அது பல்வேறு நற்பலன்களை அடைந்து முன்னேற்ற பாதையில் பயனிக்கிறது.',
    en: 'Defining and living by policy guidelines that provide good benefits. For example, when members of an organization follow its policies, it achieves various benefits and progresses on the path of improvement.'
  },
  companyPolicy: { ta: 'நிறுவனக் கொள்கை', en: 'Company Policy' },
  growthPath: { ta: 'முன்னேற்றப் பாதை', en: 'Path of Growth' },

  // Mission
  ourMission: { ta: 'நமது குறிக்கோள்', en: 'Our Mission' },
  missionTitle: { ta: 'ஒவ்வொரு குடும்பத்தின் வரலாற்றையும் பாதுகாக்கும் பயணம்', en: "A journey to protect every family's history" },
  missionDesc: { ta: 'கொடி திட்டம் மூலம் உங்கள் குடும்பத்தின் முழு வரலாற்றையும் ஒரே இடத்தில் காட்சிப்படுத்தலாம். அடுத்த தலைமுறைகள் தங்கள் வேர்களைப் பற்றி அறிந்து பெருமைப்படுவதை உறுதி செய்கிறோம்.', en: 'Through the Kodi project, visualize your entire family history in one place. We ensure future generations take pride in their roots.' },
  genConnection: { ta: 'தலைமுறை இணைப்பு', en: 'Generation Connection' },

  // Target
  primaryTarget: { ta: 'முதற்கட்ட இலக்கு', en: 'Primary Target' },
  memberTarget: { ta: '10,000 நபர்களை சேர்க்கும் இலக்கு', en: 'Member Addition Target' },
  targetDescription: { ta: '"10,000 நபர்களை அவர்களுடைய உறவுமுறை கலாச்சாரத்தின் அடிப்படையில் ஒன்றினைத்து, பல்வேறு உறவினர்களின் கடமைகள், உரிமைகள், குடும்பநிகழ்ச்சிகளை ஊக்குவிப்பு செய்து பாரம்பரிய பழக்க வழக்கங்களை அடுத்த தலைமுறையினருக்கு டிஜிட்டல் வாயிலாக எடுத்து செல்லும் முயற்சி."', en: '"An effort to unite 10,000 individuals based on their kinship culture, encouraging duties, rights, and family events, and passing on traditional customs to the next generation digitally."' },
  joinTarget: { ta: 'இந்த இலக்கில் சேருங்கள்', en: 'Join this Mission' },

  // Footer
  protector: { ta: 'தென்காசி குடும்ப பாரம்பரிய பாதுகாவலர். உங்கள் வேர்களை பாதுகாப்பதே எங்கள் கடமை.', en: 'Tenkasi Family Heritage Protector. Protecting your roots is our duty.' },
  rights: { ta: 'அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.', en: 'All rights reserved.' },
  help: { ta: 'உதவி தேவை?', en: 'Need Help?' },

  // Auth / Login Modal
  loginOtpMessage: { ta: 'எண்களின் OTP மூலமாக உள்நுழையவும்', en: 'Login via Mobile OTP' },
  adminLogin: { ta: 'நிர்வாகி உள்நுழைவு', en: 'Admin Login' },
  userLogin: { ta: 'பயனர் உள்நுழைவு', en: 'User Login' },
  nonSmartPhoneUser: { ta: 'ஸ்மார்ட் அல்லாத சாதாரண கைபேசி வைத்திருப்பவர்கள்', en: 'Users with non-smartphone mobile phones' },
  webOnlyNotice: { ta: 'WEB ONLY மூலமாக மென்பொருளை பயன்படுத்தவும்', en: 'Use the software via WEB ONLY' },
  india: { ta: 'இந்தியா', en: 'India' },
  enterOtpHint: { ta: 'கைபேசியில் பெறப்பட்ட 6 இலக்க OTP-ஐ உள்ளிடவும்', en: 'Enter the 6-digit OTP received on your mobile' },
  changeNumber: { ta: 'எண்ணை மாற்றுக', en: 'Change Number' },
  securityNote: { ta: 'OTP உங்கள் தனிப்பட்ட தகவல். மற்றவர்களுடன் பகிராதீர்கள்', en: 'OTP is your private information. Do not share with others.' },
  acceptTerms: { ta: 'உள்நுழைவதன் மூலம், கொடியின் பயன்பாட்டு விதிமுறைகள் மற்றும் தனியுரிமைக் கொள்கை ஐ ஏற்கின்றீர்கள்', en: 'By logging in, you accept the Terms of Use and Privacy Policy' },
  terms: { ta: 'பயன்பாட்டு விதிமுறைகள்', en: 'Terms of Use' },
  and: { ta: 'மற்றும்', en: 'and' },
  privacyPolicy: { ta: 'தனியுரிமைக் கொள்கை', en: 'Privacy Policy' },
  adminName: { ta: 'நிர்வாகி பெயர்', en: 'Admin Name' },
  password: { ta: 'கடவுச்சொல்', en: 'Password' },
  enterName: { ta: 'பெயரை உள்ளிடவும்', en: 'Enter name' },
  verifyOtp: { ta: 'OTP சரிபார்க்க', en: 'Verify OTP' },
  otpSentTo: { ta: 'OTP அனுப்பப்பட்டது', en: 'OTP sent to' },
  enterSixDigit: { ta: '10 இலக்க எண்ணை உள்ளிடவும்', en: 'Enter 10-digit number' },
  changePhone: { ta: 'எண்ணை மாற்றுக', en: 'Change Number' },

  // Notifications
  otpSuccess: { ta: 'OTP வெற்றிகரமாக அனுப்பப்பட்டது', en: 'OTP sent successfully' },
  otpResendSuccess: { ta: 'புதிய OTP வெற்றிகரமாக அனுப்பப்பட்டது', en: 'New OTP sent successfully' },
  adminLoginSuccess: { ta: 'நிர்வாகி உள்நுழைவு வெற்றி', en: 'Admin login successful' },
  adminLoginError: { ta: 'நிர்வாகி உள்நுழைவு தோல்வியடைந்தது', en: 'Admin login failed' },
  invalidOtp: { ta: 'தவறான OTP. மீண்டும் முயற்சிக்கவும்', en: 'Invalid OTP. Try again.' },
  otpLengthError: { ta: '6 இலக்க OTP ஐ உள்ளிடவும்', en: 'Enter 6 digit OTP' },
  phoneLengthError: { ta: 'சரியான 10 இலக்க கைபேசி எண்ணை உள்ளிடவும்', en: 'Enter a valid 10-digit mobile number' },
  otpFailure: { ta: 'OTP அனுப்ப முடியவில்லை. மீண்டும் முயற்சிக்கவும்', en: 'Could not send OTP. Try again.' },
  allDetailsError: { ta: 'அனைத்து விவரங்களையும் உள்ளிடவும்', en: 'Please enter all details' },

  // Mobile Number
  mobileNumber: { ta: 'கைபேசி எண்', en: 'Mobile Number' },
  enterMobile: { ta: 'கைபேசி எண்ணை உள்ளிடவும்', en: 'Enter mobile number' },
  continue: { ta: 'தொடரவும்', en: 'Continue' },
  enterOtp: { ta: 'OTP ஐ உள்ளிடவும்', en: 'Enter OTP' },
  verify: { ta: 'சரிபார்க்கவும்', en: 'Verify' },
  resendOtp: { ta: 'OTP மீண்டும் அனுப்பு', en: 'Resend OTP' },
  otpSent: { ta: 'OTP அனுப்பப்பட்டது', en: 'OTP sent to' },

  // Profile
  firstName: { ta: 'முதல் பெயர்', en: 'First Name' },
  secondName: { ta: 'இரண்டாம் பெயர்', en: 'Second Name' },
  thirdName: { ta: 'மூன்றாம் பெயர்', en: 'Third Name' },
  fatherName: { ta: 'தந்தை பெயர்', en: "Father's Name" },
  motherName: { ta: 'தாய் பெயர்', en: "Mother's Name" },
  gender: { ta: 'பாலினம்', en: 'Gender' },
  male: { ta: 'ஆண்', en: 'Male' },
  female: { ta: 'பெண்', en: 'Female' },
  other: { ta: 'மற்றவை', en: 'Other' },
  dateOfBirth: { ta: 'பிறந்த தேதி', en: 'Date of Birth' },
  age: { ta: 'வயது', en: 'Age' },
  save: { ta: 'சேமிக்கவும்', en: 'Save' },
  cancel: { ta: 'ரத்து செய்', en: 'Cancel' },

  // Posts
  whatsOnMind: { ta: 'உங்கள் எண்ணம் என்ன?', en: "What's on your mind?" },
  post: { ta: 'பதிவிடு', en: 'Post' },
  like: { ta: 'விரும்பு', en: 'Like' },
  comment: { ta: 'கருத்து', en: 'Comment' },
  share: { ta: 'பகிர்', en: 'Share' },
  writeComment: { ta: 'கருத்து எழுதுங்கள்...', en: 'Write a comment...' },

  // Chat
  startChat: { ta: 'அரட்டை தொடங்கு', en: 'Start Chat' },
  typeMessage: { ta: 'செய்தி எழுதுங்கள்...', en: 'Type a message...' },
  send: { ta: 'அனுப்பு', en: 'Send' },
  online: { ta: 'ஆன்லைன்', en: 'Online' },
  offline: { ta: 'ஆஃப்லைன்', en: 'Offline' },

  // Connections
  addFamilyMember: { ta: 'குடும்ப உறுப்பினரைச் சேர்', en: 'Add Family Member' },
  accept: { ta: 'ஏற்கவும்', en: 'Accept' },
  reject: { ta: 'நிராகரி', en: 'Reject' },
  pending: { ta: 'நிலுவையில்', en: 'Pending' },
  Relatives: { ta: 'உறவினர்கள்', en: 'Relatives' },
  requests: { ta: 'கோரிக்கைகள்', en: 'Requests' },
  familyMembers: { ta: 'குடும்ப உறுப்பினர்கள்', en: 'Family Members' },
  accepted: { ta: 'ஏற்கப்பட்டது', en: 'Accepted' },
  rejected: { ta: 'நிராகரிக்கப்பட்டது', en: 'Rejected' },
  cancelled: { ta: 'ரத்து செய்யப்பட்டது', en: 'Cancelled' },
  expired: { ta: 'காலாவதியானது', en: 'Expired' },
  view: { ta: 'காண்க', en: 'View' },
  details: { ta: 'விவரங்கள்', en: 'Details' },
  you: { ta: 'நீங்கள்', en: 'You' },
  backToMyConnections: { ta: 'எனது உறவுகளுக்குத் திரும்பு', en: 'Back to my connections' },

  // Common
  loading: { ta: 'ஏற்றுகிறது...', en: 'Loading...' },
  error: { ta: 'பிழை', en: 'Error' },
  success: { ta: 'வெற்றி', en: 'Success' },
  delete: { ta: 'நீக்கு', en: 'Delete' },
  edit: { ta: 'திருத்து', en: 'Edit' },
  search: { ta: 'தேடு', en: 'Search' },
  upload: { ta: 'பதிவேற்று', en: 'Upload' },
  privacy: { ta: 'தனியுரிமை', en: 'Privacy' },
  termsLink: { ta: 'விதிமுறைகள்', en: 'Terms' },
  cookies: { ta: 'குக்கீகள்', en: 'Cookies' },

  // Kinship Terms
  Father: { ta: 'தந்தை', en: 'Father' },
  Mother: { ta: 'தாய்', en: 'Mother' },
  'Elder Brother': { ta: 'அண்ணன்', en: 'Elder Brother' },
  'Elder Sister': { ta: 'அக்கா', en: 'Elder Sister' },
  'Younger Brother': { ta: 'தம்பி', en: 'Younger Brother' },
  'Younger Sister': { ta: 'தங்கை', en: 'Younger Sister' },
  Son: { ta: 'மகன்', en: 'Son' },
  Daughter: { ta: 'மகள்', en: 'Daughter' },
  Husband: { ta: 'கணவர்', en: 'Husband' },
  Wife: { ta: 'மனைவி', en: 'Wife' },
  Ashramam: { ta: 'ஆசிரமம்', en: 'Ashramam' },
  'Ashramam Member': { ta: 'ஆசிரம உறுப்பினர்', en: 'Ashramam Member' },
  Brother: { ta: 'சகோதரர்', en: 'Brother' },
  Sister: { ta: 'சகோதரி', en: 'Sister' },
  Self: { ta: 'நீங்கள்', en: 'Self' },

  // Dashboard
  totalMembers: { ta: 'மொத்த உறுப்பினர்கள்', en: 'Total Members' },
  newJoinees: { ta: 'புதிய சேர்க்கைகள்', en: 'New Joinees' },
  activeSessions: { ta: 'செயலில் உள்ள அமர்வுகள்', en: 'Active Sessions' },
  growthRate: { ta: 'வளர்ச்சி விகிதம்', en: 'Growth Rate' },
  adminPanel: { ta: 'நிர்வாகக் குழு', en: 'Admin Panel' },
  overview: { ta: 'மேலோட்டம்', en: 'Overview' },
  userManagement: { ta: 'பயனர் மேலாண்மை', en: 'User Management' },
  analytics: { ta: 'பகுப்பாய்வு', en: 'Analytics' },
  adminDashboard: { ta: 'நிர்வாகி டாஷ்போர்டு', en: 'Administrator Dashboard' },
  monitorMembers: { ta: 'அனைத்து உறுப்பினர்களையும் கண்காணிக்கவும் நிர்வகிக்கவும்', en: 'Monitor and manage all family members' },
  searchUsers: { ta: 'பயனர்களைத் தேடு...', en: 'Search users...' },
  export: { ta: 'ஏற்றுமதி', en: 'Export' },
  user: { ta: 'பயனர்', en: 'User' },
  mobile: { ta: 'கைபேசி', en: 'Mobile' },
  status: { ta: 'நிலை', en: 'Status' },
  joinDate: { ta: 'சேர்ந்த தேதி', en: 'Join Date' },
  action: { ta: 'செயல்', en: 'Action' },
  showing: { ta: 'காட்டுகிறது', en: 'Showing' },
  of: { ta: 'இல்', en: 'of' },
  previous: { ta: 'முந்தைய', en: 'Previous' },
  next: { ta: 'அடுத்தது', en: 'Next' },
  activeStatus: { ta: 'செயலில்', en: 'Active' },
  offlineStatus: { ta: 'ஆஃப்லைன்', en: 'Offline' },

  // Genealogy Modals
  editName: { ta: 'பெயர் திருத்து', en: 'Edit Name' },
  connect: { ta: 'இணைக்கவும்', en: 'Connect' },
  nextFlower: { ta: 'அடுத்த மலர்', en: 'Next Flower' },
  addPeople: { ta: 'நபர்களைச் சேர்', en: 'Add People' },
  newName: { ta: 'புதிய பெயர்', en: 'New Name' },
  enterNewName: { ta: 'புதிய பெயரை உள்ளிடவும்', en: 'Enter new name' },
  invitationSent: { ta: 'அழைப்பு அனுப்பப்பட்டது!', en: 'Invitation sent successfully!' },
  sendInvitationTitle: { ta: 'அழைப்பு அனுப்பவும்', en: 'Send Invitation' },
  inviteToJoin: { ta: 'இணைய அழைக்கவும்', en: 'Invite to join' },

  // Profile Page
  profileTitle: { ta: 'சுயவிவரம்', en: 'Profile' },
  profileSubtitle: { ta: 'சுயவிவர விவரங்கள்', en: 'Profile Details' },
  goToGenealogy: { ta: 'கொடிவழி வரைபடம் செல்லவும்', en: 'Go to Geneology Map' },
  step1Public: { ta: 'படி 1 - பகிரங்க விவரங்கள்', en: 'Step 1 - Public Details' },
  step2Private: { ta: 'படி 2 - தனிப்பட்ட விவரங்கள்', en: 'Step 2 - Private Details' },
  step3Cultural: { ta: 'படி 3 - கலாச்சார விவரங்கள்', en: 'Step 3 - Cultural Details' },
  native: { ta: 'சொந்த ஊர்', en: 'Native' },
  presentCity: { ta: 'தற்போதைய நகரம்', en: 'Present City' },
  taluk: { ta: 'தாலுகா', en: 'Taluk' },
  district: { ta: 'மாவட்டம்', en: 'District' },
  state: { ta: 'மாநிலம்', en: 'State' },
  contactNumber: { ta: 'தொடர்பு எண்', en: 'Contact Number' },
  nationality: { ta: 'தேசியம்', en: 'Nationality' },
  cultureOfLife: { ta: 'வாழ்க்கை முறை', en: 'Culture of Life' },
  preferredLanguage: { ta: 'தாய்மொழி', en: 'Preferred Language' },
  saving: { ta: 'சேமிக்கிறது...', en: 'Saving...' },
  firstnameError: { ta: 'முதல் பெயர் தேவை', en: 'First Name is required' },
  profileLoadError: { ta: 'சுயவிவரத்தை ஏற்ற முடியவில்லை', en: 'Could not load profile' },
  profileSaveSuccess: { ta: 'சுயவிவரம் வெற்றிகரமாகச் சேமிக்கப்பட்டது!', en: 'Profile saved successfully!' },
  selectGender: { ta: 'பாலினம் தேர்ந்தெடுக்கவும்', en: 'Select Gender' },
  selectLanguage: { ta: 'மொழி தேர்ந்தெடுக்கவும்', en: 'Select Language' },
  userName: { ta: 'பயனாளர் பெயர்', en: 'User Name' },

  // Next Flower Modal
  nextFlowerFor: { ta: 'அடுத்த மலர் - ', en: 'Next Flower - ' },
  existingConnections: { ta: 'தற்போதுள்ள இணைப்புகள்', en: 'Existing Connections' },
  addNewFamilyMember: { ta: 'புதிய குடும்ப உறுப்பினரைச் சேர்க்கவும்', en: 'Add New Family Member' },
  enterNameFor: { ta: 'பெயரை உள்ளிடவும்: ', en: 'Enter Name for ' },
  addPerson: { ta: 'நபரைச் சேர்', en: 'Add Person' },
  placeholderNote: { ta: 'இது ஒரு மாதிரி நபர். இவருக்கு உறவினர்களைச் சேர்ப்பதன் மூலம் குடும்ப மரத்தை உருவாக்கலாம்.', en: 'This is a placeholder person. Add relatives to build their family tree.' },
  readyToAddNote: { ta: 'குடும்ப உறுப்பினர்களைச் சேர்க்கத் தயார்', en: 'Ready to add family members' },
  loadingOptions: { ta: 'விருப்பங்கள் ஏற்றப்படுகின்றன...', en: 'Loading options...' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'ta';
  });

  // Log language changes
  useEffect(() => {
    console.log("LanguageContext: Current language changed to", language);
  }, [language]);

  const handleSetLanguage = (lang: Language) => {
    console.log("LanguageContext: Setting language to", lang);
    setLanguage(lang);
    localStorage.setItem('language', lang);
    console.log("LanguageContext: Language saved to localStorage");
  };

  const t = (key: string): string => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}