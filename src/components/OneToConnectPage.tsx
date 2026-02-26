import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Users, ArrowRight, User, Loader2, Info, ChevronRight, X, MapPin } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { genealogyService } from '../services/genealogyService';
import api from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Person {
    id: number;
    full_name: string;
    mobile_number?: string;
    gender: string;
    image?: string;
    relation_label?: string;
}

interface PathStep {
    person_id: number;
    name: string;
    gender: string;
    relation_to_prev: string;
    relation_label: string;
    arrow_label?: string;
    image?: string;
}

export default function OneToConnectPage() {
    const { t, language } = useLanguage();
    const isTamil = language === 'ta';

    // Search states
    const [fromQuery, setFromQuery] = useState('');
    const [toQuery, setToQuery] = useState('');
    const [fromSuggestions, setFromSuggestions] = useState<Person[]>([]);
    const [toSuggestions, setToSuggestions] = useState<Person[]>([]);
    const [isSearchingFrom, setIsSearchingFrom] = useState(false);
    const [isSearchingTo, setIsSearchingTo] = useState(false);

    // Selection states
    const [selectedFrom, setSelectedFrom] = useState<Person | null>(null);
    const [selectedTo, setSelectedTo] = useState<Person | null>(null);

    // Result states
    const [path, setPath] = useState<PathStep[]>([]);
    const [isFindingPath, setIsFindingPath] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Search debouncing
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (fromQuery.trim().length >= 3 && !selectedFrom) {
                setIsSearchingFrom(true);
                try {
                    const response = await genealogyService.searchPersons(fromQuery);
                    setFromSuggestions(response.suggestions || []);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsSearchingFrom(false);
                }
            } else {
                setFromSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [fromQuery, selectedFrom]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (toQuery.trim().length >= 3 && !selectedTo) {
                setIsSearchingTo(true);
                try {
                    const response = await genealogyService.searchPersons(toQuery);
                    setToSuggestions(response.suggestions || []);
                } catch (error) {
                    console.error("Search error:", error);
                } finally {
                    setIsSearchingTo(false);
                }
            } else {
                setToSuggestions([]);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [toQuery, selectedTo]);

    const handleFindPath = async () => {
        if (!selectedFrom || !selectedTo) {
            toast.error(isTamil ? 'இருவரையும் தேர்ந்தெடுக்கவும்' : 'Please select both people');
            return;
        }

        if (selectedFrom.id === selectedTo.id) {
            toast.error(isTamil ? 'இருவரும் ஒரே நபர்' : 'Both people are the same');
            return;
        }

        try {
            setIsFindingPath(true);
            setHasSearched(true);

            // Attempt to call the find-path API
            // If the API doesn't exist yet, we'll handle the error
            const response = await api.post('/api/relations/find-path/', {
                from_person_id: selectedFrom.id,
                to_person_id: selectedTo.id
            });

            if (response.data && response.data.path) {
                setPath(response.data.path);
            } else {
                setPath([]);
                toast.error(isTamil ? 'உறவுமுறை கண்டறியப்படவில்லை' : 'No relationship found');
            }
        } catch (error: any) {
            console.error("Path finding error:", error);
            setPath([]);
            toast.error(isTamil ? 'உறவுமுறை கண்டறிய முடியவில்லை' : 'Could not find relationship path');
        } finally {
            setIsFindingPath(false);
        }
    };

    const HoneycombBackground = () => (
        <div className="absolute inset-0 pointer-events-none opacity-[0.05] overflow-hidden">
            <svg className="w-full h-full">
                <defs>
                    <pattern id="honeycomb-one" x="0" y="0" width="56" height="97" patternUnits="userSpaceOnUse">
                        <path
                            d="M28 0 L56 16 V48 L28 64 L0 48 V16 Z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1"
                            className="text-amber-600"
                        />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#honeycomb-one)" />
            </svg>
        </div>
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-amber-50 via-white to-orange-50 py-12 px-4 relative overflow-hidden">
            <HoneycombBackground />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-bold mb-4 shadow-sm border border-amber-200"
                    >
                        <Users size={16} />
                        {isTamil ? 'இணைப்பு சேவை' : 'Connection Service'}
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-linear-to-r from-amber-800 to-amber-600 mb-4"
                    >
                        One to Connect
                    </motion.h1>
                    <p className="text-gray-600 max-w-2xl mx-auto text-lg">
                        {isTamil
                            ? 'இரு நபர்களுக்கு இடையேயான உறவுமுறையை வரைபடமாக அறியுங்கள்'
                            : 'Discover the relationship path between any two family members visualized as a map'}
                    </p>
                </div>

                {/* Search Controls */}
                <div className="bg-white rounded-3xl shadow-2xl border border-amber-100 p-6 md:p-8 mb-12">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6">
                        {/* FROM Search */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 pl-1">
                                {isTamil ? 'யாருக்காக (இருந்து)' : 'FROM (Starting Person)'}
                            </label>
                            <div className="relative group">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${selectedFrom ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {selectedFrom ? <User size={20} /> : <Search size={20} />}
                                </div>
                                <input
                                    type="text"
                                    value={selectedFrom ? selectedFrom.full_name : fromQuery}
                                    onChange={(e) => setFromQuery(e.target.value)}
                                    readOnly={!!selectedFrom}
                                    placeholder={isTamil ? 'பெயர் அல்லது மொபைல் எண்...' : 'Search name or mobile...'}
                                    className={`w-full pl-12 pr-12 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all ${selectedFrom
                                            ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold'
                                            : 'border-gray-100 focus:border-amber-400 focus:bg-white text-gray-800'
                                        }`}
                                />
                                {selectedFrom && (
                                    <button
                                        onClick={() => { setSelectedFrom(null); setFromQuery(''); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-200 rounded-full text-amber-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                {isSearchingFrom && (
                                    <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Suggestions Dropdown */}
                            <AnimatePresence>
                                {fromSuggestions.length > 0 && !selectedFrom && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden max-h-60 overflow-y-auto"
                                    >
                                        {fromSuggestions.map(person => (
                                            <button
                                                key={person.id}
                                                onClick={() => { setSelectedFrom(person); setFromSuggestions([]); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 border-b border-gray-50 last:border-0 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {person.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{person.full_name}</div>
                                                    <div className="text-xs text-gray-500">{person.mobile_number || (isTamil ? 'மொபைல் இல்லை' : 'No mobile')}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Middle Arrow */}
                        <div className="flex justify-center pt-6">
                            <div className="w-12 h-12 rounded-full bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                                <ArrowRight size={24} className="md:rotate-0 rotate-90" />
                            </div>
                        </div>

                        {/* TO Search */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-amber-700 uppercase tracking-widest mb-2 pl-1">
                                {isTamil ? 'யாருடன் (வரை)' : 'TO (Target Person)'}
                            </label>
                            <div className="relative group">
                                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${selectedTo ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {selectedTo ? <User size={20} /> : <Search size={20} />}
                                </div>
                                <input
                                    type="text"
                                    value={selectedTo ? selectedTo.full_name : toQuery}
                                    onChange={(e) => setToQuery(e.target.value)}
                                    readOnly={!!selectedTo}
                                    placeholder={isTamil ? 'பெயர் அல்லது மொபைல் எண்...' : 'Search name or mobile...'}
                                    className={`w-full pl-12 pr-12 py-4 bg-gray-50 border-2 rounded-2xl focus:outline-none transition-all ${selectedTo
                                            ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold'
                                            : 'border-gray-100 focus:border-amber-400 focus:bg-white text-gray-800'
                                        }`}
                                />
                                {selectedTo && (
                                    <button
                                        onClick={() => { setSelectedTo(null); setToQuery(''); }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-amber-200 rounded-full text-amber-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                                {isSearchingTo && (
                                    <div className="absolute right-12 top-1/2 -translate-y-1/2">
                                        <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Suggestions Dropdown */}
                            <AnimatePresence>
                                {toSuggestions.length > 0 && !selectedTo && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden max-h-60 overflow-y-auto"
                                    >
                                        {toSuggestions.map(person => (
                                            <button
                                                key={person.id}
                                                onClick={() => { setSelectedTo(person); setToSuggestions([]); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-linear-to-r hover:from-amber-50 hover:to-orange-50 border-b border-gray-50 last:border-0 transition-colors text-left"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {person.full_name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900">{person.full_name}</div>
                                                    <div className="text-xs text-gray-500">{person.mobile_number || (isTamil ? 'மொபைல் இல்லை' : 'No mobile')}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={handleFindPath}
                            disabled={isFindingPath || !selectedFrom || !selectedTo}
                            className="px-12 py-4 bg-linear-to-r from-amber-800 to-amber-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-amber-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 uppercase tracking-widest"
                        >
                            {isFindingPath ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    {isTamil ? 'தேடுகிறது...' : 'Connecting...'}
                                </>
                            ) : (
                                <>
                                    <Users size={24} />
                                    {isTamil ? 'இணைப்புப் பாலம்' : 'CONNECT NOW'}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Results Visualization Area */}
                <AnimatePresence>
                    {hasSearched && !isFindingPath && (
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-4xl shadow-2xl border border-amber-100 p-8 min-h-[500px] relative overflow-hidden"
                        >
                            {path.length > 0 ? (
                                <div className="relative flex flex-col items-center py-12">
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-0.5 h-full bg-linear-to-b from-amber-200 via-amber-400 to-amber-200 opacity-20"></div>
                                    </div>

                                    <div className="space-y-16 relative w-full max-w-lg">
                                        {path.map((step, index) => (
                                            <div key={`${step.person_id}-${index}`} className="flex flex-col items-center relative">
                                                {/* Person Node (Hexagon) */}
                                                <motion.div
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className="relative z-10"
                                                >
                                                    <div className={`w-32 h-36 flex items-center justify-center relative p-1 transition-all duration-300 transform hover:scale-110`}>
                                                        {/* Custom Hexagon SVG */}
                                                        <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full drop-shadow-xl">
                                                            <path
                                                                d="M50 0 L100 28.8 L100 86.2 L50 115 L0 86.2 L0 28.8 Z"
                                                                fill={index === 0 ? "#92400e" : index === path.length - 1 ? "#15803d" : "#ffffff"}
                                                                stroke={index === 0 ? "#f59e0b" : index === path.length - 1 ? "#22c55e" : "#d1d5db"}
                                                                strokeWidth="3"
                                                            />
                                                        </svg>

                                                        <div className="relative z-20 flex flex-col items-center text-center p-3">
                                                            <div className={`w-14 h-14 rounded-full border-2 mb-2 flex items-center justify-center overflow-hidden ${index === 0 || index === path.length - 1 ? 'border-amber-200 bg-amber-700/50' : 'border-amber-100 bg-amber-50'
                                                                }`}>
                                                                {step.image ? (
                                                                    <img src={step.image} alt={step.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <User className={index === 0 || index === path.length - 1 ? "text-white w-8 h-8" : "text-amber-500 w-8 h-8"} />
                                                                )}
                                                            </div>
                                                            <div className={`text-[10px] font-black leading-tight uppercase ${index === 0 || index === path.length - 1 ? 'text-white' : 'text-gray-800'}`}>
                                                                {step.name}
                                                            </div>
                                                            <div className={`text-[8px] mt-1 font-bold ${index === 0 || index === path.length - 1 ? 'text-amber-200' : 'text-amber-600'}`}>
                                                                {index === 0 ? (isTamil ? 'தொடக்கம்' : 'START') : index === path.length - 1 ? (isTamil ? 'இலக்கு' : 'TARGET') : (step.relation_label || step.relation_to_prev)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>

                                                {/* Connection Arrow */}
                                                {index < path.length - 1 && (
                                                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 h-16 flex flex-col items-center justify-center">
                                                        <div className="w-1 h-full bg-linear-to-b from-amber-400 to-amber-200"></div>

                                                        {/* Relation Badge */}
                                                        <div className="absolute top-1/2 -translate-y-1/2 bg-white px-3 py-1 rounded-full border border-amber-200 shadow-md whitespace-nowrap z-20">
                                                            <div className="text-[10px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1">
                                                                {path[index + 1].arrow_label || path[index + 1].relation_label || path[index + 1].relation_to_prev}
                                                                <ChevronRight size={10} className="rotate-90" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Summary Footer */}
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="mt-12 p-6 bg-linear-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 text-center"
                                    >
                                        <div className="text-amber-800 font-bold mb-2 flex items-center justify-center gap-2">
                                            <Info size={18} />
                                            {isTamil ? 'உறவுமுறை சுருக்கம்' : 'Relationship Summary'}
                                        </div>
                                        <div className="text-gray-700 font-medium text-lg">
                                            {selectedFrom?.full_name} <ArrowRight className="inline mx-2 text-amber-500" /> {selectedTo?.full_name}
                                        </div>
                                        <div className="mt-4 inline-flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-2xl font-black text-amber-600">{path.length - 1}</span>
                                                <span className="text-[10px] font-bold text-gray-500 uppercase">{isTamil ? 'படிகள்' : 'STEPS'}</span>
                                            </div>
                                            <div className="w-0.5 h-8 bg-amber-200"></div>
                                            <div className="flex flex-col text-left">
                                                <span className="text-sm font-bold text-gray-800">
                                                    {isTamil ? 'உங்களுக்கு இடையிலான பந்தம்' : 'Bond found through'}
                                                </span>
                                                <span className="text-xs text-amber-600 font-medium">
                                                    {path.map(s => s.name.split(' ')[0]).join(' → ')}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
                                        <MapPin size={48} />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                                        {isTamil ? 'முடிவுகள் ஏதுமில்லை' : 'No relation path found'}
                                    </h3>
                                    <p className="text-gray-500 max-w-sm">
                                        {isTamil
                                            ? 'இந்த இரு நபர்களுக்கும் இடையே நேரடி அல்லது மறைமுக உறவுமுறை ஏதும் கண்டறியப்படவில்லை'
                                            : 'We couldn\'t find a direct or indirect relationship pathway between these two people in your family tree'}
                                    </p>
                                    <button
                                        onClick={() => { setHasSearched(false); setSelectedFrom(null); setSelectedTo(null); }}
                                        className="mt-6 text-amber-600 font-bold hover:underline"
                                    >
                                        {isTamil ? 'மீண்டும் தேடுக' : 'Try another search'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {!hasSearched && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <div className="inline-block p-6 rounded-full bg-white shadow-xl border border-amber-50 mb-6">
                            <Users size={64} className="text-amber-200" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-400">
                            {isTamil ? 'தேடலைத் தொடங்குங்கள்' : 'Start searching to find bridges'}
                        </h2>
                        <p className="text-gray-400 mt-2">
                            {isTamil
                                ? 'இருவரைத் தேர்ந்தெடுத்து "CONNECT NOW" என்பதை அழுத்தவும்'
                                : 'Select two people and click "CONNECT NOW" to calculate their bond'}
                        </p>
                    </motion.div>
                )}
            </div>

            <style>{`
        .clip-path-hexagon {
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
        </div>
    );
}
