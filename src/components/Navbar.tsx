import React from "react";
import { Home, Users, MessageCircle, User, LogOut, Globe, TreeDeciduous } from "lucide-react";
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
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isAdmin = localStorage.getItem('userRole') === 'admin';

  const toggleLanguage = () => {
    setLanguage(language === "ta" ? "en" : "ta");
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white text-gray-900 shadow-md sticky top-0 z-50 border-b border-amber-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div
            onClick={() => navigate("/")}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-linear-to-r from-amber-600 to-yellow-700 p-1.5 shadow-lg group-hover:shadow-xl transition-all duration-300">
              <div className="w-full h-full bg-white rounded-lg flex items-center justify-center overflow-hidden">
                <img
                  src="/src/images/logo.png"
                  alt="Logo"
                  className="w-full h-full object-cover p-0.5"
                  style={{ filter: 'sepia(0.4) hue-rotate(-10deg) saturate(1.2)' }}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter bg-linear-to-r from-amber-700 to-yellow-700 bg-clip-text text-transparent">
                {t('kodi')}
              </span>
              <span className="text-xs text-gray-500 font-medium tracking-wide">
                {t('genealogy')}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1 sm:space-x-2">
              {!isAdmin ? (
                <>
                  <NavBtn
                    icon={<Home className="h-5 w-5" />}
                    label={t("home")}
                    active={isActive("/home")}
                    onClick={() => navigate("/home")}
                  />

                  <NavBtn
                    icon={<TreeDeciduous className="h-5 w-5" />}
                    label={t("genealogy")}
                    active={isActive("/genealogy")}
                    onClick={() => navigate("/genealogy")}
                  />

                  <NavBtn
                    icon={<MessageCircle className="h-5 w-5" />}
                    label={t("chat")}
                    active={isActive("/chat")}
                    onClick={() => navigate("/chat")}
                  />

                  <NavBtn
                    icon={<Users className="h-5 w-5" />}
                    label={t("connections")}
                    active={isActive("/connections")}
                    onClick={() => navigate("/connections")}
                  />

                  <NavBtn
                    icon={<User className="h-5 w-5" />}
                    label={t("profile")}
                    active={isActive("/profile")}
                    onClick={() => navigate("/profile")}
                  />
                </>
              ) : (
                <NavBtn
                  icon={<Globe className="h-5 w-5" />}
                  label={t('adminDashboard')}
                  active={isActive("/dashboard")}
                  onClick={() => navigate("/dashboard")}
                  className="bg-linear-to-r from-amber-600 to-yellow-700 text-white hover:from-amber-700 hover:to-yellow-800 shadow-md"
                />
              )}
            </div>
          )}

          {/* Right Actions & Mobile Toggle */}
          <div className="flex items-center space-x-3">
            {/* Language Button */}
            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-linear-to-r from-amber-50 to-yellow-50 text-amber-800 hover:from-amber-100 hover:to-yellow-100 transition-all border border-amber-200 font-bold shadow-sm hover:shadow"
            >
              <Globe className="h-5 w-5" />
              <span className="text-sm font-bold">
                {language === "ta" ? "தமிழ்" : "English"}
              </span>
            </button>

            {/* Desktop Login/Logout */}
            <div className="hidden md:block">
              {isAuthenticated ? (
                <button
                  onClick={onLogout}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-red-50 to-orange-50 text-red-700 hover:from-red-100 hover:to-orange-100 transition-all border border-red-200 shadow-sm hover:shadow font-bold"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-sm">
                    {t("logout")}
                  </span>
                </button>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="flex items-center space-x-2 px-6 py-3 rounded-full bg-linear-to-r from-amber-600 to-yellow-700 text-white hover:from-amber-700 hover:to-yellow-800 transition-all font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 border border-amber-500/30"
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm font-bold">{t("login")}</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2.5 rounded-lg bg-linear-to-r from-amber-50 to-yellow-50 text-amber-700 hover:from-amber-100 hover:to-yellow-100 border border-amber-200 shadow-sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {/* Hamburger Icon */}
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-amber-100 shadow-xl absolute w-full left-0 z-40 animate-slideDown cursor-pointer">
          <div className="p-4 space-y-2">
            {isAuthenticated && (
              <>
                {!isAdmin ? (
                  <>
                    <MobileNavBtn
                      label={t("home")}
                      icon={<Home size={20} />}
                      onClick={() => { navigate("/home"); setIsMobileMenuOpen(false); }}
                      active={isActive("/home")}
                    />
                    <MobileNavBtn
                      label={t("genealogy")}
                      icon={<TreeDeciduous size={20} />}
                      onClick={() => { navigate("/genealogy"); setIsMobileMenuOpen(false); }}
                      active={isActive("/genealogy")}
                    />
                    <MobileNavBtn
                      label={t("chat")}
                      icon={<MessageCircle size={20} />}
                      onClick={() => { navigate("/chat"); setIsMobileMenuOpen(false); }}
                      active={isActive("/chat")}
                    />
                    <MobileNavBtn
                      label={t("connections")}
                      icon={<Users size={20} />}
                      onClick={() => { navigate("/connections"); setIsMobileMenuOpen(false); }}
                      active={isActive("/connections")}
                    />
                    <MobileNavBtn
                      label={t("profile")}
                      icon={<User size={20} />}
                      onClick={() => { navigate("/profile"); setIsMobileMenuOpen(false); }}
                      active={isActive("/profile")}
                    />
                  </>
                ) : (
                  <MobileNavBtn
                    label={t('adminDashboard')}
                    icon={<Globe size={20} />}
                    onClick={() => { navigate("/dashboard"); setIsMobileMenuOpen(false); }}
                    active={isActive("/dashboard")}
                  />
                )}
                <hr className="border-amber-100 my-2" />
              </>
            )}
            {isAuthenticated ? (
              <button
                onClick={onLogout}
                className="w-full flex items-center space-x-3 p-3.5 rounded-xl bg-linear-to-r from-red-50 to-orange-50 text-red-700 hover:from-red-100 hover:to-orange-100 border border-red-200 cursor-pointer"
              >
                <LogOut size={20} />
                <span className="font-bold">{t("logout")}</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="w-full flex items-center space-x-3 p-3.5 rounded-xl bg-linear-to-r from-amber-600 to-yellow-700 text-white shadow-md cursor-pointer"
              >
                <User size={20} />
                <span className="font-bold">{t("login")}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

function MobileNavBtn({ label, icon, onClick, active }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 p-3.5 rounded-xl transition-all ${active
        ? 'bg-linear-to-r from-amber-50 to-yellow-50 text-amber-800 font-bold border border-amber-200 shadow-sm'
        : 'text-gray-600 hover:bg-amber-50/50 hover:text-amber-700 cursor-pointer'
        }`}
    >
      <div className={`${active ? 'text-amber-600' : 'text-gray-500'}`}>
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}

/* Reusable Nav Button */
function NavBtn({
  icon,
  label,
  active,
  onClick,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all font-medium ${className} ${active
        ? (className ? "" : "bg-linear-to-r from-amber-50 to-yellow-50 text-amber-800 font-bold border border-amber-200 shadow-sm")
        : "text-gray-600 hover:bg-linear-to-r hover:from-amber-50/50 hover:to-yellow-50/50 hover:text-amber-700 cursor-pointer"
        }`}
    >
      <div className={active ? "text-amber-600" : "text-gray-500"}>
        {icon}
      </div>
      <span className="hidden sm:inline text-sm">{label}</span>
    </button>
  );
}