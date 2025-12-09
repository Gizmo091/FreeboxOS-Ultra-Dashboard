import React, { useState, useEffect } from 'react';
import { X, Clock, Loader2, Check, AlertTriangle, Save, Calendar } from 'lucide-react';
import { useSystemStore } from '../../stores/systemStore';

interface RebootScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

export const RebootScheduleModal: React.FC<RebootScheduleModalProps> = ({
  isOpen,
  onClose
}) => {
  const { schedule, fetchSchedule, updateSchedule } = useSystemStore();
  
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState('03:00');
  const [days, setDays] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    await fetchSchedule();
    setLoading(false);
  };

  useEffect(() => {
    if (schedule) {
      setEnabled(schedule.enabled);
      setTime(schedule.time);
      setDays(schedule.days);
    }
  }, [schedule]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const success = await updateSchedule({
      enabled,
      time,
      days
    });

    if (success) {
      setSuccess('Planification enregistrée');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError('Erreur lors de l\'enregistrement');
    }
    setSaving(false);
  };

  const toggleDay = (day: number) => {
    setDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151515] w-full max-w-md rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#1a1a1a]">
          <div>
            <h2 className="text-xl font-bold text-white">Redémarrage planifié</h2>
            <p className="text-sm text-gray-500 mt-1">Programmer le redémarrage automatique</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : (
            <>
              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-emerald-900/30 border border-emerald-700 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                  <Check size={16} />
                  {success}
                </div>
              )}

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl border border-gray-800">
                <div>
                  <h3 className="text-white font-medium">Activer la planification</h3>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${ 
                    enabled ? 'bg-emerald-500' : 'bg-gray-700'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${ 
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Clock size={16} />
                  Heure du redémarrage
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-800 rounded-xl text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Days Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Calendar size={16} />
                  Jours d'exécution
                </label>
                <div className="flex justify-between gap-1">
                  {DAYS.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value)}
                      className={`flex-1 aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${ 
                        days.includes(day.value)
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                          : 'bg-[#1a1a1a] text-gray-500 hover:bg-[#252525] hover:text-gray-300'
                      }`}
                    >
                      {day.label[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Note :</strong> Cette fonctionnalité utilise le serveur du dashboard pour déclencher le redémarrage. Le dashboard doit être en cours d'exécution au moment prévu.
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Enregistrer la planification
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
