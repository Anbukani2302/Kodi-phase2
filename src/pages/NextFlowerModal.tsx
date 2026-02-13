import React, { useState, useEffect } from "react";
import { User, Flower, X, Loader2, Check, Plus } from "lucide-react";
import { genealogyService } from "../services/genealogyService";
import { useLanguage } from "../contexts/LanguageContext";

interface NextFlowerModalProps {
  open: boolean;
  onClose: () => void;
  personId: string;
  personName: string;
  onSuccess?: (message: string, newPerson?: any) => void;
  onError?: (error: string) => void;
}

interface FlowOption {
  action: string;
  label: string;
  relation_code?: string;
  auto_gender?: string;
  icon: string;
  category?: string;
  description?: string;
}

interface ExistingRelation {
  person_id: number;
  name: string;
  direct_relation: string;
  relation_label: string;
  relation_to_viewer: string;
}

interface NewPerson {
  id: number;
  name: string;
  gender: string;
  is_placeholder: boolean;
}

interface Relation {
  id: number;
  type: string;
  status: string;
  from_person_id: number;
  to_person_id: number;
}

const NextFlowerModal: React.FC<NextFlowerModalProps> = ({
  open,
  onClose,
  personId,
  personName,
  onSuccess,
  onError
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<FlowOption[]>([]);
  const [existingRelations, setExistingRelations] = useState<ExistingRelation[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [personData, setPersonData] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newlyAddedPerson, setNewlyAddedPerson] = useState<NewPerson | null>(null);

  useEffect(() => {
    if (open && personId) {
      loadNextFlow();
    }
  }, [open, personId]);

  // Helper function to map action to relation label
  const getRelationLabel = (action: string): string => {
    const relationMap: Record<string, string> = {
      'add_father': t('Father'),
      'add_mother': t('Mother'),
      'add_son': t('Son'),
      'add_daughter': t('Daughter'),
      'add_elder_brother': t('Elder Brother'),
      'add_younger_brother': t('Younger Brother'),
      'add_elder_sister': t('Elder Sister'),
      'add_younger_sister': t('Younger Sister'),
      'add_wife': t('Wife'),
      'add_husband': t('Husband'),
      'add_spouse': t('Husband') // Fallback
    };

    return relationMap[action] || action.replace('add_', '').replace('_', ' ');
  };

  // Helper function to map action to direct relation
  const mapActionToDirectRelation = (action: string): string => {
    const actionMap: Record<string, string> = {
      'add_father': 'FATHER',
      'add_mother': 'MOTHER',
      'add_son': 'SON',
      'add_daughter': 'DAUGHTER',
      'add_elder_brother': 'ELDER_BROTHER',
      'add_younger_brother': 'YOUNGER_BROTHER',
      'add_elder_sister': 'ELDER_SISTER',
      'add_younger_sister': 'YOUNGER_SISTER',
      'add_wife': 'WIFE',
      'add_husband': 'HUSBAND',
      'add_spouse': 'SPOUSE'
    };

    return actionMap[action] || action.replace('add_', '').toUpperCase();
  };

  const loadNextFlow = async () => {
    try {
      setLoading(true);
      console.log(`Loading next flow for person ID: ${personId}`);

      const response = await genealogyService.getNextFlow(personId);
      console.log("Next flow API response:", response);

      setOptions(response.options || []);
      setExistingRelations(response.existing_relations || []);
      setStatus(response.status);
      setPersonData(response.person);

    } catch (error: any) {
      console.error("Error loading next flow:", error);
      if (onError) {
        onError(error.response?.data?.message || t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActionSelect = (option: FlowOption) => {
    setSelectedAction(option.action);
    setNameInput("");
    setSuccessMessage(null);
    setNewlyAddedPerson(null);

    if (option.action === "view_tree" || option.action === "skip") {
      handleSpecialAction(option.action);
    }
  };

  const handleSpecialAction = async (action: string) => {
    try {
      setSubmitting(true);

      if (action === "view_tree") {
        onClose();
      } else if (action === "skip") {
        onClose();
      }
    } catch (error: any) {
      console.error("Error handling special action:", error);
      if (onError) {
        onError(t('error'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAction || !nameInput.trim()) {
      return;
    }

    try {
      setSubmitting(true);
      setSuccessMessage(null);
      setNewlyAddedPerson(null);

      const payload = {
        action: selectedAction,
        name: nameInput.trim()
      };

      const response = await genealogyService.addRelativeAction(personId, payload);

      if (response.success) {
        const successMsg = response.message || t('success');
        setSuccessMessage(successMsg);

        if (response.new_person) {
          setNewlyAddedPerson(response.new_person);

          const relationLabel = getRelationLabel(selectedAction);
          const newRelation: ExistingRelation = {
            person_id: response.new_person.id,
            name: response.new_person.name,
            direct_relation: mapActionToDirectRelation(selectedAction),
            relation_label: relationLabel,
            relation_to_viewer: relationLabel
          };

          setExistingRelations(prev => [...prev, newRelation]);
        }

        if (onSuccess) {
          onSuccess(successMsg, response.new_person);
        }

        setTimeout(() => {
          setSelectedAction(null);
          setNameInput("");
          setSuccessMessage(null);
          loadNextFlow();
        }, 2000);
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || t('error');
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const groupedOptions: Record<string, FlowOption[]> = {};
  options.forEach(option => {
    const category = option.category || 'other';
    if (!groupedOptions[category]) {
      groupedOptions[category] = [];
    }
    groupedOptions[category].push(option);
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-amber-100">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-amber-50 px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-amber-100 p-2.5 rounded-xl">
                <Flower className="text-amber-600" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">
                  {t('nextFlowerFor')}{personName}
                </h3>
                <p className="text-sm text-amber-700/60 font-medium">
                  {t('monitorMembers')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-amber-400 hover:text-amber-600 p-2 rounded-full hover:bg-amber-50 transition-colors"
              disabled={submitting}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20">
            <Loader2 className="animate-spin text-amber-600 mb-4" size={40} />
            <p className="text-amber-800 font-medium">{t('loadingOptions')}</p>
          </div>
        ) : (
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 120px)' }}>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl animate-fadeIn">
                <div className="flex items-center gap-3">
                  <Check className="text-amber-600" size={20} />
                  <div>
                    <p className="font-bold text-amber-900">{successMessage}</p>
                    {newlyAddedPerson && (
                      <p className="text-sm text-amber-700 mt-1">
                        {t('success')}: {newlyAddedPerson.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Existing Relations Section */}
            {existingRelations.length > 0 && (
              <div className="mb-8">
                <h4 className="text-xs font-bold text-amber-600 mb-4 uppercase tracking-widest">
                  {t('existingConnections')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {existingRelations.map((relation, index) => (
                    <div
                      key={index}
                      className={`bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex items-center justify-between group hover:border-amber-200 transition-colors ${newlyAddedPerson && newlyAddedPerson.id === relation.person_id
                          ? 'ring-2 ring-amber-300 animate-pulse'
                          : ''
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <User className="text-amber-600" size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-amber-900">{relation.name}</p>
                          <p className="text-xs text-amber-600/70 font-bold uppercase tracking-wider">
                            {t(relation.relation_label)}
                          </p>
                        </div>
                      </div>
                      <Check className="text-amber-600" size={18} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Selection Section */}
            <div className="mb-8">
              <h4 className="text-xs font-bold text-amber-600 mb-4 uppercase tracking-widest">
                {t('addNewFamilyMember')}
              </h4>

              {/* Name Input */}
              {selectedAction && selectedAction.startsWith('add_') && !successMessage && (
                <div className="mb-8 bg-amber-50/30 p-6 rounded-2xl border border-amber-100 shadow-sm animate-fadeIn">
                  <label className="block text-sm font-bold text-amber-900 mb-3 uppercase tracking-wide">
                    {t('enterNameFor')} {t(selectedAction.replace('add_', '').replace('_', ' '))}
                  </label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={t('enterNewName')}
                    className="w-full px-4 py-3 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent mb-4 outline-none shadow-sm bg-white"
                    disabled={submitting}
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && nameInput.trim()) {
                        handleSubmit();
                      }
                    }}
                  />
                  <div className="flex justify-end items-center gap-3">
                    <button
                      onClick={() => {
                        setSelectedAction(null);
                        setNameInput("");
                      }}
                      className="px-6 py-2.5 text-amber-700 font-bold hover:bg-amber-50 rounded-xl transition-all"
                      disabled={submitting}
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!nameInput.trim() || submitting}
                      className="px-8 py-2.5 bg-linear-to-r from-amber-600 to-yellow-600 text-white rounded-xl font-bold hover:from-amber-700 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          {t('saving')}
                        </>
                      ) : (
                        <>
                          <Plus size={18} strokeWidth={3} />
                          {t('addPerson')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(groupedOptions).map(([category, catOptions]) => (
                  <div key={category} className="contents">
                    {catOptions.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleActionSelect(option)}
                        disabled={submitting || (selectedAction && selectedAction !== option.action) || successMessage}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${selectedAction === option.action
                            ? 'bg-amber-600 border-amber-600 text-white shadow-lg scale-[1.02] z-10'
                            : 'bg-white border-amber-100 text-amber-900 hover:border-amber-400 hover:shadow-md'
                          } ${(submitting || successMessage) ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl filter group-hover:scale-110 transition-transform">{option.icon || "👤"}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm truncate ${selectedAction === option.action ? 'text-white' : 'text-amber-900'}`}>
                              {option.label}
                            </p>
                            {option.description && (
                              <p className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${selectedAction === option.action ? 'text-amber-100' : 'text-amber-600/60'}`}>
                                {option.description}
                              </p>
                            )}
                          </div>
                          {selectedAction === option.action && (
                            <Check className="text-white" size={18} strokeWidth={3} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Status Info */}
            <div className="mt-6 pt-6 border-t border-amber-50">
              <div className="flex items-center gap-3 text-sm text-amber-700 font-medium">
                <div className={`w-3 h-3 rounded-full shadow-xs ${status === 'placeholder_add_options' ? 'bg-amber-400 animate-pulse' : 'bg-green-500'
                  }`}></div>
                <span>
                  {status === 'placeholder_add_options'
                    ? t('placeholderNote')
                    : t('readyToAddNote')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NextFlowerModal;
