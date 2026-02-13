import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { TreeDeciduous, Users, LogIn, Target, Award, Shield, FileCheck, Camera, BookOpen, History, Link as LinkIcon, MapPin, Phone, Mail, Menu, ChevronDown, Rocket, ShieldCheck, UserPlus, TrendingUp } from 'lucide-react';

interface LandingPageProps {
    onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
    const { t } = useLanguage();
    const [currentImage, setCurrentImage] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [showBottomNav, setShowBottomNav] = useState(false);
    const [sectionVisible, setSectionVisible] = useState({
        cards: false,
        mission: false,
        target: false
    });

    const heroImages = [
        "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?q=80&w=2071&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511988617509-a57c8a288659?q=80&w=2071&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2074&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=2070&auto=format&fit=crop"
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % heroImages.length);
        }, 2000);

        setIsVisible(true);

        // Scroll animations
        const handleScroll = () => {
            const scrollY = window.scrollY;
            setShowBottomNav(scrollY > 500);

            const cardsSection = document.getElementById('cards-section');
            const missionSection = document.getElementById('mission-section');
            const targetSection = document.getElementById('target-section');

            if (cardsSection) {
                const rect = cardsSection.getBoundingClientRect();
                if (rect.top < window.innerHeight - 100) {
                    setSectionVisible(prev => ({ ...prev, cards: true }));
                }
            }

            if (missionSection) {
                const rect = missionSection.getBoundingClientRect();
                if (rect.top < window.innerHeight - 100) {
                    setSectionVisible(prev => ({ ...prev, mission: true }));
                }
            }

            if (targetSection) {
                const rect = targetSection.getBoundingClientRect();
                if (rect.top < window.innerHeight - 100) {
                    setSectionVisible(prev => ({ ...prev, target: true }));
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => {
            clearInterval(interval);
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const cardItem = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                duration: 0.5
            }
        }
    };

    return (
        <div className="min-h-screen bg-white overflow-x-hidden">
            {/* Hero Section */}
            <div className="relative h-screen">
                {heroImages.map((image, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === currentImage ? 'opacity-100' : 'opacity-0'
                            }`}
                        style={{
                            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('${image}')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                        }}
                    />
                ))}

                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
                    {heroImages.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentImage(index)}
                            className={`w-3 h-3 rounded-full transition-all duration-300 ${index === currentImage
                                ? 'bg-white scale-125'
                                : 'bg-white/50 hover:bg-white/80'
                                }`}
                        />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    className="relative z-10 h-full flex flex-col items-center justify-center px-4"
                >
                    <div className="max-w-6xl w-full text-center">
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            className="mb-8"
                        >
                            <div className="inline-flex items-center justify-center p-2 overflow-hidden">
                                <img
                                    src="/src/images/logo.png"
                                    alt="KODI Logo"
                                    className="w-20 h-20 object-contain"
                                    style={{ filter: 'sepia(0.4) hue-rotate(-10deg) saturate(1.2)' }}
                                />
                            </div>
                        </motion.div>
                        {/* TAGLINE */}
                        <p
                            className="
    mt-1 -translate-y-2 inline-block px-6 py-3 rounded-2xl
    text-base md:text-lg lg:text-xl
    font-semibold
    bg-yellow-500/20 text-yellow-200
    backdrop-blur-sm shadow-md
    leading-relaxed
    text-center
  "
                        >
                            {t('logoTagline')}
                        </p>



                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                            <span className="block mb-2">{t('kodi')}</span>
                            <span className="text-3xl md:text-4xl bg-linear-to-r from-amber-700 via-amber-600 to-yellow-700 bg-clip-text text-transparent font-black tracking-wider">
                                {t('language') === 'ta' ? 'KODI' : 'KODI'}
                            </span>
                        </h1>




                        <div className="mb-8">
                            <p className="text-xl md:text-2xl text-white/90 font-semibold mb-2">
                                {t('familyTreeMapping')}
                            </p>
                            <p className="text-lg text-white/80">
                                {t('familyTreePlatform')}
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={onLoginClick}
                            className="bg-linear-to-r from-amber-700 via-amber-600 to-yellow-700 hover:from-amber-800 hover:via-amber-700 hover:to-yellow-800 text-white px-10 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl transition-all duration-300 flex items-center justify-center space-x-3 mx-auto cursor-pointer border border-amber-500/30"
                        >
                            <LogIn className="h-6 w-6" />
                            <span>{t('registerLogin')}</span>
                        </motion.button>

                        {/* Scroll Indicator */}
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
                        >
                            <ChevronDown className="h-8 w-8 text-white/70" />
                        </motion.div>
                    </div>
                </motion.div>
            </div>

            {/* FIRST ROW: 3 CARDS - GRID LAYOUT */}
            <div id="cards-section" className="bg-linear-to-b from-white to-gray-50 py-24 px-4 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        {/* ஹெடிங்கிற்கு லாஜோ நிறம் */}
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
                            <span className="bg-linear-to-r from-amber-700 to-yellow-700 bg-clip-text text-transparent">
                                {t('familyTreeMapping')}
                            </span>
                            <span className="text-gray-800"> {t('benefitsTitle').replace(t('familyTreeMapping'), '')}</span>
                        </h2>
                        <div className="w-24 h-2 bg-linear-to-r from-amber-500 to-yellow-600 mx-auto rounded-full mb-6"></div>
                        <p className="text-gray-600  max-w-3xl mx-auto leading-relaxed">
                            {t('benefitsSubtitle')}
                        </p>
                        <p className="text-amber-800 text-2xl max-w-3xl mx-auto leading-relaxed font-semibold mt-4">
                            {t('importantFactors')}
                        </p>
                    </motion.div>

                    {/* STATS CARDS - 2 COLUMN GRID */}
                    <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-7xl mx-auto"
                    >
                        {/* Card 1: Culture */}
                        <motion.div
                            variants={cardItem}
                            whileHover={{ y: -10 }}
                            className="relative group bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-amber-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Rocket className="h-24 w-24 text-amber-900" />
                            </div>
                            <div className="bg-linear-to-br from-amber-600 to-yellow-700 p-4 rounded-2xl w-fit mb-8 shadow-lg shadow-amber-200">
                                <Rocket className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('cultureCardTitle')}</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed text-sm line-clamp-6">{t('cultureCardDesc')}</p>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><ShieldCheck className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('companyPolicy')}</span>
                                </div>
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><TrendingUp className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('growthPath')}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Card 2: Family Connection */}
                        <motion.div
                            variants={cardItem}
                            whileHover={{ y: -10 }}
                            className="relative group bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-amber-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Users className="h-24 w-24 text-amber-900" />
                            </div>
                            <div className="bg-linear-to-br from-amber-600 to-yellow-700 p-4 rounded-2xl w-fit mb-8 shadow-lg shadow-amber-200">
                                <Users className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('familyConnection')}</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed line-clamp-3">{t('familyConnectionDesc')}</p>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><Users className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('findingRelations')}</span>
                                </div>
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><LinkIcon className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('connections')}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Card 3: Heritage Protection */}
                        <motion.div
                            variants={cardItem}
                            whileHover={{ y: -10 }}
                            className="relative group bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-amber-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Award className="h-24 w-24 text-amber-900" />
                            </div>
                            <div className="bg-linear-to-br from-amber-600 to-yellow-700 p-4 rounded-2xl w-fit mb-8 shadow-lg shadow-amber-200">
                                <Award className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('heritageProtection')}</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed line-clamp-3">{t('heritageProtectionDesc')}</p>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><History className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('familyHistory')}</span>
                                </div>
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><BookOpen className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('heritageRecords')}</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Card 4: Document Security */}
                        <motion.div
                            variants={cardItem}
                            whileHover={{ y: -10 }}
                            className="relative group bg-white/80 backdrop-blur-md rounded-3xl p-8 border border-amber-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        >
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Shield className="h-24 w-24 text-amber-900" />
                            </div>
                            <div className="bg-linear-to-br from-amber-600 to-yellow-700 p-4 rounded-2xl w-fit mb-8 shadow-lg shadow-amber-200">
                                <Shield className="h-10 w-10 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">{t('documentSecurity')}</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed line-clamp-3">{t('documentSecurityDesc')}</p>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><FileCheck className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('importantDocuments')}</span>
                                </div>
                                <div className="flex items-center space-x-4 p-3 rounded-xl bg-amber-50/50 border border-amber-50">
                                    <div className="bg-white p-2 rounded-lg shadow-sm"><Camera className="h-5 w-5 text-amber-600" /></div>
                                    <span className="text-gray-700 font-medium">{t('familyPhotos')}</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* SECOND ROW: Left Image - Right Content */}
            <div id="mission-section" className="bg-white py-24 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative group"
                        >
                            <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <img
                                    src="https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=2070&auto=format&fit=crop"
                                    alt="Family Tree"
                                    className="w-full h-100 md:h-125 object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-amber-900/80 via-amber-900/20 to-transparent"></div>
                                <div className="absolute bottom-0 left-0 right-0 p-10 text-white">
                                    <div className="flex items-center space-x-4 mb-4">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/30">
                                            <TreeDeciduous className="h-8 w-8" />
                                        </div>
                                        <h3 className="text-2xl font-bold">{t('interactiveDiscovery')}</h3>
                                    </div>
                                    <p className="text-white/80 text-lg">{t('visualizeFamily')}</p>
                                </div>
                            </div>
                            <div className="absolute -z-10 -top-6 -left-6 w-32 h-32 bg-amber-100 rounded-full blur-3xl opacity-50"></div>
                            <div className="absolute -z-10 -bottom-6 -right-6 w-48 h-48 bg-yellow-100 rounded-full blur-3xl opacity-50"></div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-8"
                        >
                            <div className="inline-flex items-center space-x-3 bg-amber-50 text-amber-700 px-6 py-2.5 rounded-full font-bold text-sm tracking-wide uppercase border border-amber-100">
                                <Target className="h-5 w-5" />
                                <span>{t('ourMission')} / OUR MISSION</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
                                {t('missionTitle').split(' ').slice(0, 3).join(' ')} <br />
                                <span className="bg-linear-to-r from-amber-700 to-yellow-700 bg-clip-text text-transparent">
                                    {t('missionTitle').split(' ').slice(3).join(' ')}
                                </span>
                            </h2>

                            <p className="text-gray-600 text-lg leading-relaxed">
                                {t('missionDesc')}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { text: t('findingRelations'), icon: <Users className="text-amber-600" /> },
                                    { text: t('heritageProtection'), icon: <Award className="text-amber-600" /> },
                                    { text: t('documentSecurity'), icon: <Shield className="text-amber-600" /> },
                                    { text: t('genConnection'), icon: <History className="text-amber-600" /> }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center space-x-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-lg transition-all">
                                        <div className="text-amber-600">{item.icon}</div>
                                        <span className="font-bold text-gray-800">{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* THIRD ROW: Target Section */}
            <div id="target-section" className="bg-linear-to-br from-amber-900 via-yellow-900 to-amber-950 py-32 px-4 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-size-[40px_40px]"></div>
                </div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        className="inline-flex items-center justify-center p-6 bg-white/10 backdrop-blur-xl rounded-4xl mb-10 border border-white/20 shadow-2xl"
                    >
                        <MapPin className="h-16 w-16 text-white" />
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter"
                    >
                        {t('primaryTarget')}
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="mb-12"
                    >
                        <p className="text-2xl md:text-3xl text-amber-200 font-bold uppercase tracking-widest">{t('memberTarget')}</p>
                    </motion.div>

                    <p className="text-white/80 text-xl md:text-2xl leading-relaxed mb-12 max-w-3xl mx-auto font-medium italic">
                        {t('targetDescription')}
                    </p>

                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onLoginClick}
                        className="bg-linear-to-r from-amber-600 to-yellow-700 hover:from-amber-700 hover:to-yellow-800 text-white px-12 py-5 rounded-2xl font-black text-xl shadow-2xl flex items-center space-x-4 mx-auto transition-all border border-amber-400/30"
                    >
                        <Rocket className="h-7 w-7 text-amber-200" />
                        <span>{t('joinTarget')}</span>
                    </motion.button>
                </div>
            </div>

            {/* COMPACT FOOTER - FIXED VISIBILITY */}
            <footer className="bg-gray-950 text-white py-12 border-t border-white/5 pb-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex flex-col items-center md:items-start space-y-4">
                            <div className="flex items-center space-x-3">
                                <div className=" flex items-center justify-center">
                                    <img
                                        src="/src/images/logo.png"
                                        alt="KODI Logo"
                                        className="h-12 w-12 object-contain"
                                    />
                                </div>

                                <span className="text-2xl font-black tracking-tighter">
                                    {t('kodi')} <span className="bg-linear-to-r from-amber-500 to-yellow-600 bg-clip-text text-transparent">{t('language') === 'ta' ? 'KODI' : ''}</span>
                                </span>
                            </div>
                            <p className="text-gray-500 max-w-xs text-center md:text-left text-sm">
                                {t('protector')}
                            </p>
                        </div>

                        <div className="flex flex-col items-center space-y-2">
                            <p className="text-gray-400 text-sm font-medium">&copy; 2026 {t('kodi')}. {t('rights')}</p>
                            <div className="flex space-x-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
                                <a href="#" className="hover:text-amber-500 transition-colors">{t('privacy')}</a>
                                <a href="#" className="hover:text-amber-500 transition-colors">{t('termsLink')}</a>
                                <a href="#" className="hover:text-amber-500 transition-colors">{t('cookies')}</a>
                            </div>
                        </div>

                        <div className="flex flex-col items-center md:items-end space-y-4">
                            <div className="flex space-x-2">
                                <a href="tel:+919876543210" className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-all flex items-center space-x-3 group">
                                    <Phone className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-bold">+91 99424 32293</span>
                                </a>
                                <a href="mailto:support@kodi.com" className="bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/10 transition-all flex items-center space-x-3 group">
                                    <Mail className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-bold">support@kodi.com</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>

            {/* FIXED BOTTOM NAVIGATION - SMOOTH ENTRANCE */}
            <AnimatePresence>
                {showBottomNav && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="fixed bottom-6 left-4 right-4 z-50 md:left-1/2 md:right-auto md:w-150 md:-translate-x-1/2"
                    >
                        <div className="bg-black/80 backdrop-blur-2xl border border-white/20 rounded-4xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between">
                            <div className="flex items-center space-x-4 pl-2">
                                <div className="bg-linear-to-r from-amber-600 to-yellow-700 p-2 rounded-xl">
                                    <TreeDeciduous className="h-6 w-6 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <div className="text-white font-black text-sm tracking-tighter leading-none">{t('kodi')}</div>
                                    <div className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mt-1">{t('genealogy')}</div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                                <a href="tel:+919876543210" className="p-3 text-white/70 hover:text-white transition-colors">
                                    <Phone className="h-5 w-5" />
                                </a>
                                <button
                                    onClick={onLoginClick}
                                    className="bg-linear-to-r from-amber-600 to-yellow-700 hover:from-amber-700 hover:to-yellow-800 text-white px-6 py-2.5 rounded-2xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center space-x-2 border border-amber-400/30"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    <span>{t('login')}</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom Styles for smoothness */}
            <style>
                {`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow { animation: spin-slow 20s linear infinite; }
                
                /* லாஜோ கலர் பேலட்டு */
                :root {
                    --kodi-amber-50: #fffbeb;
                    --kodi-amber-100: #fef3c7;
                    --kodi-amber-200: #fde68a;
                    --kodi-amber-300: #fcd34d;
                    --kodi-amber-400: #fbbf24;
                    --kodi-amber-500: #f59e0b;
                    --kodi-amber-600: #d97706;
                    --kodi-amber-700: #b45309;
                    --kodi-amber-800: #92400e;
                    --kodi-amber-900: #78350f;
                    --kodi-amber-950: #451a03;
                }
                `}
            </style>
        </div>
    );
}