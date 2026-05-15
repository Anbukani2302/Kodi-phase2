import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, Search, User, UserX, Clock, CheckCircle, ShieldAlert, ChevronRight, LayoutGrid, Info } from 'lucide-react';
import api, { BASE_URL } from '../services/api';
import { genealogyService } from '../services/genealogyService';
import { authService } from '../services/authService';
import { toast } from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';

interface RelationItem {
    id: number;
    from_person: number;
    from_person_name: string;
    to_person: number;
    to_person_name: string;
    relation_code: string;
    status: string;
    arrow_label?: string;
    display_with_order?: string;
    brick_person_name?: string;
    created_at: string;
}

interface RelationsResponse {
    incoming: RelationItem[];
    outgoing: RelationItem[];
    generation_info: any;
}

const DeleteRelationPage: React.FC = () => {
    const { t, language } = useLanguage();
    const [relations, setRelations] = useState<RelationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [userId, setUserId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [relationToDelete, setRelationToDelete] = useState<RelationItem | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        fetchProfileAndRelations();
    }, []);

    const fetchProfileAndRelations = async () => {
        try {
            setLoading(true);
            setError(null);

            const profile = await authService.getMyProfile();
            const personMe = await genealogyService.getPersonMe();
            const currentUserId = personMe?.id || profile?.id;

            if (!currentUserId) {
                throw new Error('User ID not found');
            }

            setUserId(currentUserId);

            const response = await api.get(`/api/genealogy/persons/${currentUserId}/relations/`);
            const data: RelationsResponse = response.data;

            const allRelations = [...data.incoming, ...data.outgoing];
            allRelations.sort((a, b) => b.created_at.localeCompare(a.created_at));

            setRelations(allRelations);
        } catch (err: any) {
            console.error('Failed to fetch relations:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load relations');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteClick = (relation: RelationItem) => {
        setRelationToDelete(relation);
        setShowConfirmModal(true);
    };

    const confirmDelete = async () => {
        if (!relationToDelete) return;

        try {
            const relation = relationToDelete;
            setIsDeleting(relation.id);
            setShowConfirmModal(false);

            const targetId = relation.from_person === userId ? relation.to_person : relation.from_person;

            if (relation.status === 'confirmed' || relation.status === 'active') {
                const res = await genealogyService.deleteConnected(targetId);
                toast.success(res.message || 'Connected relation deleted');
            } else if (relation.status === 'pending') {
                const res = await genealogyService.deletePlaceholder(targetId);
                toast.success(res.message || 'Placeholder relation deleted');
            } else {
                const res = await genealogyService.deletePlaceholder(targetId);
                toast.success(res.message || 'Relation deleted');
            }

            fetchProfileAndRelations();
        } catch (err: any) {
            console.error('Delete failed:', err);
            toast.error(err.response?.data?.message || 'Delete failed');
        } finally {
            setIsDeleting(null);
            setRelationToDelete(null);
        }
    };

    const filteredRelations = relations.filter(r =>
        r.from_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.to_person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.relation_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-amber-50/50 via-orange-50/30 to-amber-50/50 p-4 md:p-8 font-sans transition-colors duration-500">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-10 text-center md:text-left border-b border-amber-200 pb-6 relative">
                    <div className="absolute -top-4 -left-4 w-24 h-24 bg-amber-100 rounded-full blur-3xl opacity-50"></div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-black text-amber-900 mb-2 flex items-center justify-center md:justify-start gap-3">
                                <div className="p-2 bg-linear-to-br from-amber-600 to-orange-600 rounded-2xl shadow-xl transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                    <UserX className="text-white" size={24} />
                                </div>
                                <span className="bg-linear-to-r from-amber-800 to-orange-700 bg-clip-text text-transparent">
                                    {language === 'ta' ? 'உறவு முறையை நீக்கு' : 'Delete Relation'}
                                </span>
                            </h1>
                            <p className="text-amber-700 font-medium flex items-center justify-center md:justify-start gap-2">
                                <ShieldAlert size={16} className="text-orange-500" />
                                {language === 'ta'
                                    ? 'தேவையற்ற அல்லது தவறான உறவுகளை இங்கிருந்து நீக்கலாம்.'
                                    : 'Manage and remove incorrect or pending relations.'}
                            </p>
                        </div>

                        {/* Search Bar */}
                        <div className="relative group w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder={language === 'ta' ? 'தேடு...' : 'Search people...'}
                                className="w-full bg-white border-2 border-amber-100 py-3 pl-12 pr-4 rounded-2xl focus:outline-hidden focus:ring-4 focus:ring-orange-100/50 focus:border-orange-500 transition-all text-amber-900 placeholder:text-amber-200 shadow-inner"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* List Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-200 border-t-amber-600"></div>
                        <p className="text-amber-800 font-bold animate-pulse uppercase tracking-widest text-xs">{t('loading')}</p>
                    </div>
                ) : error ? (
                    <div className="bg-white border-b-4 border-red-500 p-8 rounded-3xl shadow-2xl max-w-md mx-auto text-center animate-in fade-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="text-red-500 animate-bounce" size={40} />
                        </div>
                        <h3 className="text-red-900 font-black text-xl mb-2 uppercase tracking-tight">{language === 'ta' ? 'பிழை ஏற்பட்டது' : 'Connection Error'}</h3>
                        <p className="text-gray-600 mb-8 leading-relaxed font-medium">{error}</p>
                        <button
                            onClick={fetchProfileAndRelations}
                            className="w-full px-6 py-4 bg-linear-to-r from-amber-600 to-amber-700 text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-lg transition-all active:scale-95 border-b-4 border-amber-900"
                        >
                            Retry Connection
                        </button>
                    </div>
                ) : filteredRelations.length === 0 ? (
                    <div className="bg-white border border-amber-100 p-16 rounded-3xl text-center shadow-xl max-w-2xl mx-auto">
                        <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LayoutGrid size={48} className="text-amber-200" />
                        </div>
                        <h3 className="text-amber-900 font-bold text-2xl mb-2 uppercase tracking-tight">{language === 'ta' ? 'எந்த தரவும் இல்லை' : 'No Relations Found'}</h3>
                        <p className="text-amber-700/60 font-medium">{language === 'ta' ? 'உறுப்பினர்களை நீக்க தேடல் முடிவுகள் எதுவும் கிடைக்கவில்லை.' : 'No members match your current search criteria.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRelations.map((relation) => (
                            <div
                                key={relation.id}
                                className="group bg-white border border-amber-100 rounded-3xl p-6 hover:border-orange-400 hover:shadow-2xl transition-all duration-300 relative overflow-hidden shadow-sm"
                            >
                                {/* Status Badge */}
                                <div className="absolute top-4 right-4">
                                    {relation.status === 'confirmed' || relation.status === 'active' ? (
                                        <span className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xs">
                                            <CheckCircle size={10} /> Confirmed
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xs">
                                            <Clock size={10} /> Pending
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-5">
                                    {/* Avatar Placeholder */}
                                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-2xl shadow-lg group-hover:rotate-6 transition-transform duration-500">
                                        {(relation.from_person === userId ? relation.to_person_name : relation.from_person_name).charAt(0).toUpperCase()}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-black text-amber-900 mb-1 truncate group-hover:text-orange-600 transition-colors">
                                            {relation.from_person === userId ? relation.to_person_name : relation.from_person_name}
                                        </h3>
                                        <div className="flex items-center gap-2 text-amber-700/70 text-xs font-bold uppercase tracking-wider mb-1">
                                            <ChevronRight size={14} className="text-orange-500" />
                                            <span>{relation.arrow_label || relation.display_with_order || relation.relation_code}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center justify-between pt-6 border-t border-amber-50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-amber-900/30 font-black uppercase tracking-widest mb-0.5">Status</span>
                                        <span className={`text-[10px] font-black uppercase tracking-tight ${relation.status === 'confirmed' ? 'text-green-600' : 'text-amber-600'}`}>
                                            {relation.status}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteClick(relation)}
                                        disabled={isDeleting === relation.id}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl font-black uppercase tracking-widest text-[10px] transition-all duration-300 disabled:opacity-50 group/delete hover:shadow-lg hover:shadow-red-100 active:scale-95 border border-red-100 hover:border-red-600"
                                    >
                                        {isDeleting === relation.id ? (
                                            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <Trash2 size={14} className="group-hover/delete:scale-110 transition-transform" />
                                        )}
                                        {language === 'ta' ? 'நீக்கு' : 'Delete'}
                                    </button>
                                </div>

                                {/* Hover Gradient Line */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-linear-to-r from-amber-500 to-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer info */}
                {!loading && !error && (
                    <div className="mt-16 text-center">
                        <div className="inline-flex items-center gap-3 px-6 py-4 bg-white/80 border border-amber-100 rounded-3xl text-amber-800/60 text-xs font-bold uppercase tracking-widest shadow-inner backdrop-blur-sm">
                            <Info size={16} className="text-orange-500" />
                            <span>{language === 'ta'
                                ? 'நீக்கப்பட்ட உறவுகளை மீண்டும் சேர்க்க வம்சாவளி பிரிவிற்குச் செல்லவும்.'
                                : 'Deleted relations can be added again through the Genealogy section.'}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom Confirmation Modal */}
            {showConfirmModal && relationToDelete && (
                <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-amber-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-4xl max-w-sm w-full shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-linear-to-r from-amber-800 to-amber-700 px-6 py-6 text-white relative overflow-hidden">
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-white/10 p-0.5 border border-white/20 shrink-0">
                                    <div className="w-full h-full bg-linear-to-br from-amber-50 to-orange-50 rounded-lg flex items-center justify-center">
                                        <img src="/images/logo.png" alt="Logo" className="w-full h-full object-cover scale-110" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-widest leading-none mb-1">{language === 'ta' ? 'உறுதியாக நீக்கவா?' : 'Confirm Delete'}</h3>
                                    <p className="text-amber-100/70 text-[10px] font-black uppercase tracking-widest leading-none">Account Safety Control</p>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-full bg-linear-to-l from-white/10 to-transparent -skew-x-12 transform translate-x-32"></div>
                        </div>

                        <div className="p-8 text-center bg-linear-to-b from-amber-50/30 to-white">
                            <p className="text-amber-900 font-medium leading-relaxed mb-8">
                                {language === 'ta'
                                    ? `${relationToDelete.from_person === userId ? relationToDelete.to_person_name : relationToDelete.from_person_name} உடனான உங்கள் ${relationToDelete.arrow_label || relationToDelete.relation_code} உறவை நீக்க விரும்புகிறீர்களா?`
                                    : `Do you really want to remove your ${relationToDelete.arrow_label || relationToDelete.relation_code} relation with ${relationToDelete.from_person === userId ? relationToDelete.to_person_name : relationToDelete.from_person_name}?`}
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={confirmDelete}
                                    className="w-full py-4 bg-linear-to-r from-red-600 to-red-700 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:shadow-red-200 active:scale-95 border-b-4 border-red-900 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> {language === 'ta' ? 'ஆம், நீக்கு' : 'Yes, Remove Relation'}
                                </button>

                                <button
                                    onClick={() => { setShowConfirmModal(false); setRelationToDelete(null); }}
                                    className="w-full py-4 bg-white text-amber-900 border-2 border-amber-100 rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] hover:bg-amber-50 transition-all active:scale-95"
                                >
                                    {language === 'ta' ? 'வேண்டாம்' : 'Cancel Action'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeleteRelationPage;
