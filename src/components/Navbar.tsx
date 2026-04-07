// Updated Navbar.tsx - Add Connected People option

import React, { useState, useEffect } from "react";
import { Home, Users, MessageCircle, User, LogOut, Globe, TreeDeciduous, Download, Users2, Settings, X, Menu, ChevronDown, LayoutGrid, UserPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

interface NavbarProps {
  onLoginClick: () => void;
  onLogout: () => void;
  isAuthenticated: boolean;
}

export default function Navbar({
  onLoginClick,
  onLogout,
  isAuthenticated,
}: NavbarProps) {
  const isAdmin = localStorage.getItem('userRole') === 'admin';
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [modalImage, setModalImage] = useState<{ src: string; title: string } | null>(null);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const isLandingPage = location.pathname === '/';
  const isFeedPage = location.pathname === '/home';
  const isGenealogyPage = location.pathname === '/genealogy';
  const isAutoHidingNavbar = isGenealogyPage;
  const [navVisible, setNavVisible] = useState(!isAutoHidingNavbar);

  // Hide navbar only on genealogy page, show on hover. Always visible on others.
  useEffect(() => {
    if (isAutoHidingNavbar) {
      setNavVisible(false);
    } else {
      setNavVisible(true);
    }
  }, [location.pathname, isAutoHidingNavbar]);

  // Close menus when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsServicesOpen(false);
  }, [location.pathname]);

  // Close mobile menu on window resize (if screen becomes large)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === "ta" ? "en" : "ta";
    console.log("Switching language from", language, "to", newLanguage);
    setLanguage(newLanguage);
  };

  const isActive = (path: string) => location.pathname === path;

  // Modal Component
  const ImageModal = () => {
    if (!modalImage) return null;

    return (
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-100 p-4 animate-fadeIn"
        onClick={() => setModalImage(null)}
      >
        <div
          className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scaleIn"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header with gradient */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-amber-100 bg-linear-to-r from-amber-800 to-amber-700">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{modalImage.title}</h3>
            <button
              onClick={() => setModalImage(null)}
              className="p-2 rounded-lg hover:bg-white/20 text-white transition-all duration-200 hover:rotate-90 cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Image */}
          <div className="p-4 sm:p-6 bg-linear-to-br from-amber-50 to-orange-50">
            <div className="rounded-xl overflow-hidden shadow-inner border border-amber-200">
              <img
                src={modalImage.src}
                alt={modalImage.title}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-amber-100 bg-linear-to-br from-amber-50 to-orange-50 flex justify-end">
            <button
              onClick={() => setModalImage(null)}
              className="px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-linear-to-r from-amber-800 to-amber-700 text-white hover:from-amber-900 hover:to-amber-800 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base cursor-pointer"
            >
              மூடு
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Modified click handlers
  const handleSettingsClick = () => {
    setModalImage({
      src: "/src/images/setting.png",
      title: "அமைப்புகள்"
    });
  };

  const handleDownloadClick = () => {
    setModalImage({
      src: "/src/images/connect.png",
      title: "பதிவிறக்க வசதிகள்"
    });
  };

  const handleRelationshipClick = () => {
    setModalImage({
      src: "/src/images/map.png",
      title: "இருவருக்கான உறவுமுறை"
    });
  };

  const handleConnectedPeopleClick = () => {
    navigate("/connected-people");
  };

  return (
    <>
      {/* Invisible hover trigger zone at top - only on auto-hiding pages */}
      {isAutoHidingNavbar && !navVisible && (
        <div
          className="fixed top-0 left-0 right-0 h-6 z-101 cursor-pointer"
          onMouseEnter={() => setNavVisible(true)}
        />
      )}
      <nav
        className={`bg-white text-gray-900 top-0 z-100 border-b border-amber-200/80 shadow-lg transition-all duration-300 ease-in-out ${isAutoHidingNavbar
          ? `fixed w-full ${navVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'}`
          : 'sticky'
          }`}
        onMouseLeave={() => {
          if (isAutoHidingNavbar) {
            setNavVisible(false);
            setIsServicesOpen(false);
          }
        }}
      >
        {/* First Row - Logo and Right Actions with gradient */}
        <div className="border-b border-amber-100 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              {/* Logo Section - Responsive with pointer */}
              <div
                onClick={() => navigate("/")}
                className="flex items-center space-x-2 sm:space-x-4 cursor-pointer group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate("/")}
              >
                <div className="relative w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl overflow-hidden bg-linear-to-br from-amber-800 to-amber-700 p-0.5 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                  <div className="w-full h-full bg-linear-to-br from-amber-50 to-orange-50 rounded-md sm:rounded-lg flex items-center justify-center overflow-hidden">
                    <img
                      src="/src/images/logo.png"
                      alt="Logo"
                      className="w-full h-full object-cover scale-110 group-hover:scale-125 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg sm:text-xl font-black tracking-tight bg-linear-to-r from-amber-800 to-amber-700 bg-clip-text text-transparent">
                    {t('kodi')}
                  </span>
                  <span className="hidden xs:flex text-[10px] sm:text-xs text-amber-700 font-medium tracking-wide items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-amber-600"></span>
                    {t('genealogy')}
                  </span>
                </div>
              </div>

              {/* Right Actions - Responsive */}
              <div className="flex items-center space-x-1 sm:space-x-2">
                {/* Services Button with Dropdown */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      onClick={() => setIsServicesOpen(!isServicesOpen)}
                      className={`flex items-center space-x-1 px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl transition-all border font-medium shadow-sm hover:shadow-md group cursor-pointer ${isServicesOpen
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-amber-700 border-amber-200 hover:border-amber-300'
                        }`}
                    >
                      <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
                      <span className="text-xs sm:text-sm font-semibold">{t('services') || 'Services'}</span>
                      <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Services Dropdown */}
                    {isServicesOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-amber-100 py-2 z-102 animate-fadeIn">
                        <button
                          onClick={() => {
                            navigate("/genealogy", { state: { mode: 'two-way' } });
                            setIsServicesOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-gray-700 hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800 transition-colors"
                        >
                          <Users2 className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium">
                            {language === 'en' ? 'Create Two-Way Relation' : 'உறவு இணை'}
                          </span>                        </button>

                        {/* New Connected People Option */}
                        <button
                          onClick={() => {
                            handleConnectedPeopleClick();
                            setIsServicesOpen(false);
                          }}
                          className="w-full flex items-center space-x-3 px-4 py-2.5 text-left text-gray-700 hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-800 transition-colors border-t border-amber-100 mt-1 pt-2"
                        >
                          <UserPlus className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium">
                            {language === 'ta' ? 'உறவு முறை பட்டியல்' : 'Relationship List'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Settings Icon */}
                <button
                  onClick={handleSettingsClick}
                  className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white text-amber-700 hover:bg-linear-to-br hover:from-amber-50 hover:to-orange-50 transition-all border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md group cursor-pointer"
                  title="Settings"
                >
                  <Settings className="h-4 w-4 sm:h-4.5 sm:w-4.5 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                {/* Language Button */}
                <button
                  onClick={toggleLanguage}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-white text-amber-700 hover:bg-linear-to-br hover:from-amber-50 hover:to-orange-50 transition-all border border-amber-200 hover:border-amber-300 font-medium shadow-sm hover:shadow-md group cursor-pointer"
                >
                  <Globe className="h-3 w-3 sm:h-4 sm:w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs sm:text-sm font-semibold">
                    {language === "ta" ? "தமிழ்" : "Eng"}
                  </span>
                </button>

                {/* Login/Logout Button */}
                {isAuthenticated ? (
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all border border-red-400 shadow-sm hover:shadow-md font-medium group cursor-pointer"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 group-hover:translate-x-0.5 transition-transform" />
                    <span className="hidden xs:inline text-xs sm:text-sm font-semibold">{t("logout")}</span>
                  </button>
                ) : (
                  <button
                    onClick={onLoginClick}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-5 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-linear-to-r from-amber-800 to-amber-700 text-white hover:from-amber-900 hover:to-amber-800 transition-all font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <User className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm font-semibold">{t("login")}</span>
                  </button>
                )}

                {/* Mobile Menu Toggle Button */}
                <button
                  className="md:hidden flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white text-amber-700 hover:bg-linear-to-br hover:from-amber-50 hover:to-orange-50 border border-amber-200 shadow-sm transition-all hover:shadow-md cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Navigation with gradient */}
        {isAuthenticated && (
          <div className="hidden md:block bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-center space-x-1 py-1 sm:py-2 overflow-x-auto scrollbar-hide">
                {!isAdmin ? (
                  <>
                    <NavBtn
                      icon={<Home className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("home")}
                      active={isActive("/home")}
                      onClick={() => navigate("/home")}
                    />

                    <NavBtn
                      icon={<TreeDeciduous className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("genealogy")}
                      active={isActive("/genealogy")}
                      onClick={() => navigate("/genealogy")}
                    />

                    <NavBtn
                      icon={<Download className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("download")}
                      tooltip={t("downloadOptions")}
                      active={isActive("/downloads")}
                      onClick={handleDownloadClick}
                    />

                    <NavBtn
                      icon={<Users2 className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("relationship")}
                      tooltip={t("relationshipFinder")}
                      active={isActive("/relationship")}
                      onClick={handleRelationshipClick}
                    />

                    <NavBtn
                      icon={<MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("chat")}
                      active={isActive("/chat")}
                      onClick={() => navigate("/chat")}
                    />

                    <NavBtn
                      icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("connections")}
                      active={isActive("/connections")}
                      onClick={() => navigate("/connections")}
                    />

                    <NavBtn
                      icon={<User className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t("profile")}
                      active={isActive("/profile")}
                      onClick={() => navigate("/profile")}
                    />


                  </>
                ) : (
                  <>
                    <NavBtn
                      icon={<Globe className="h-4 w-4 sm:h-5 sm:w-5" />}
                      label={t('adminDashboard')}
                      active={isActive("/dashboard")}
                      onClick={() => navigate("/dashboard")}
                      className="bg-linear-to-r from-amber-800 to-amber-700 text-white hover:from-amber-900 hover:to-amber-800 shadow-md hover:shadow-lg"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu Drawer with gradient */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-x-0 top-16 sm:top-20 bg-linear-to-b from-amber-50 to-orange-50 border-t border-amber-200 shadow-xl z-40 animate-slideDown max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="p-3 sm:p-4 space-y-1">
              {isAuthenticated && (
                <>
                  {!isAdmin ? (
                    <div className="grid grid-cols-1 gap-1">
                      <MobileNavBtn
                        label={language === 'en' ? 'Create Two-Way Relation' : 'உறவு இணை'}
                        icon={<Users2 size={18} />}
                        onClick={() => { navigate("/genealogy", { state: { mode: 'two-way' } }); }}
                        active={isActive("/genealogy") && location.state?.mode === 'two-way'}
                      />
                      <MobileNavBtn
                        label={language === 'ta' ? 'இணைக்கப்பட்ட மக்கள்' : 'Connected People'}
                        icon={<UserPlus size={18} />}
                        onClick={() => { handleConnectedPeopleClick(); }}
                        active={isActive("/connected-people")}
                      />
                      <MobileNavBtn
                        label={t("home")}
                        icon={<Home size={18} />}
                        onClick={() => { navigate("/home"); }}
                        active={isActive("/home")}
                      />
                      <MobileNavBtn
                        label={t("genealogy")}
                        icon={<TreeDeciduous size={18} />}
                        onClick={() => { navigate("/genealogy"); }}
                        active={isActive("/genealogy")}
                      />
                      <MobileNavBtn
                        label="பதிவிறக்க வசதிகள்"
                        icon={<Download size={18} />}
                        onClick={() => {
                          handleDownloadClick();
                        }}
                        active={isActive("/downloads")}
                      />
                      <MobileNavBtn
                        label="இருவருக்கான உறவுமுறை"
                        icon={<Users2 size={18} />}
                        onClick={() => {
                          handleRelationshipClick();
                        }}
                        active={isActive("/relationship")}
                      />
                      <MobileNavBtn
                        label={t("chat")}
                        icon={<MessageCircle size={18} />}
                        onClick={() => { navigate("/chat"); }}
                        active={isActive("/chat")}
                      />
                      <MobileNavBtn
                        label={t("connections")}
                        icon={<Users size={18} />}
                        onClick={() => { navigate("/connections"); }}
                        active={isActive("/connections")}
                      />
                      <MobileNavBtn
                        label={t("profile")}
                        icon={<User size={18} />}
                        onClick={() => { navigate("/profile"); }}
                        active={isActive("/profile")}
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-1">
                      <MobileNavBtn
                        label={t('adminDashboard')}
                        icon={<Globe size={18} />}
                        onClick={() => { navigate("/dashboard"); }}
                        active={isActive("/dashboard")}
                        className="bg-linear-to-r from-amber-800 to-amber-700 text-white"
                      />
                    </div>
                  )}
                  <hr className="border-amber-200 my-2" />
                </>
              )}

              {/* Mobile Logout/Login Section */}
              <div className="pt-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-linear-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all group cursor-pointer hover:shadow-md"
                  >
                    <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
                    <span className="font-semibold text-sm">{t("logout")}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onLoginClick();
                    }}
                    className="w-full flex items-center justify-center space-x-2 p-3 rounded-xl bg-linear-to-r from-amber-800 to-amber-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    <User size={18} />
                    <span className="font-semibold text-sm">{t("login")}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Image Modal */}
      < ImageModal />
    </>
  );
}

// MobileNavBtn component with gradient hover
function MobileNavBtn({ label, icon, onClick, active, className = "" }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 p-3 sm:p-4 rounded-xl transition-all duration-200 cursor-pointer ${active
        ? 'bg-linear-to-r from-amber-100 to-amber-50 text-amber-800 font-semibold border border-amber-300 shadow-md'
        : 'text-gray-600 hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 hover:shadow-sm'
        } ${className}`}
    >
      <div className={`${active ? 'text-amber-600' : 'text-gray-500'}`}>
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

// Desktop NavBtn component with gradient hover
function NavBtn({
  icon,
  label,
  tooltip,
  active,
  onClick,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={tooltip || label}
      className={`group relative flex items-center space-x-1 sm:space-x-2 px-2 sm:px-5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm whitespace-nowrap cursor-pointer ${active
        ? className || "bg-linear-to-r from-amber-100 to-amber-50 text-amber-800 font-semibold border border-amber-300 shadow-md"
        : "text-gray-600 hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 hover:text-amber-700 hover:shadow-sm"
        } ${className}`}
    >
      <div className={`transition-transform duration-200 group-hover:scale-110 ${active ? "text-amber-600" : "text-gray-500 group-hover:text-amber-600"
        }`}>
        {icon}
      </div>
      <span className="hidden lg:inline">{label}</span>

      {/* Active Indicator */}
      {active && (
        <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-amber-600 rounded-full"></span>
      )}
    </button>
  );
}

/* Add global styles for animations */
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes scaleIn {
    from { 
      opacity: 0;
      transform: scale(0.9);
    }
    to { 
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }
  
  .animate-scaleIn {
    animation: scaleIn 0.3s ease-out;
  }
  
  .animate-slideDown {
    animation: slideDown 0.3s ease-out;
  }
  
  /* Hide scrollbar for Chrome, Safari and Opera */
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  /* Extra small devices (phones, 360px and down) */
  @media (max-width: 360px) {
    .xs\\:flex {
      display: flex;
    }
    .xs\\:hidden {
      display: none;
    }
  }
`;
document.head.appendChild(style);