'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Plus, Clock, 
  Send, Trash2, Users, X, Check, Loader2, Mail
} from 'lucide-react';

interface ScheduledEmail {
  id: number;
  title: string;
  subject: string;
  scheduled_date: string;
  scheduled_time: string;
  quote_id: string | number | null;
  custom_message: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  recipient_count: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Quote {
  id: string | number;
  text: string;
  author: string;
}

interface FestivalCalendarProps {
  scheduledEmails: ScheduledEmail[];
  users: User[];
  quotes: Quote[];
  onTriggerSend?: () => Promise<{ processed: number }>;
  onScheduleEmail: (data: {
    title: string;
    subject: string;
    scheduled_date: string;
    scheduled_time: string;
    quote_id: string | number | null;
    custom_message: string;
    user_ids: number[];
  }) => Promise<void>;
  onDeleteScheduled: (id: number) => Promise<void>;
  onRefresh: () => void;
}

// Common holidays/festivals (hardcoded - no backend needed)
const COMMON_HOLIDAYS: Record<string, { name: string; emoji: string }> = {
  '01-01': { name: 'New Year', emoji: '🎉' },
  '01-26': { name: 'Republic Day', emoji: '🇮🇳' },
  '02-14': { name: "Valentine's Day", emoji: '❤️' },
  '03-08': { name: "Women's Day", emoji: '👩' },
  '03-17': { name: "St. Patrick's Day", emoji: '☘️' },
  '04-01': { name: "April Fools", emoji: '🃏' },
  '05-01': { name: 'Labour Day', emoji: '👷' },
  '06-21': { name: 'Yoga Day', emoji: '🧘' },
  '07-04': { name: 'Independence Day (US)', emoji: '🇺🇸' },
  '08-15': { name: 'Independence Day (IN)', emoji: '🇮🇳' },
  '10-02': { name: 'Gandhi Jayanti', emoji: '🕊️' },
  '10-31': { name: 'Halloween', emoji: '🎃' },
  '11-14': { name: "Children's Day", emoji: '👶' },
  '12-25': { name: 'Christmas', emoji: '🎄' },
  '12-31': { name: "New Year's Eve", emoji: '🥳' },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FestivalCalendar({
  scheduledEmails,
  users,
  quotes,
  onTriggerSend,
  onScheduleEmail,
  onDeleteScheduled,
  onRefresh
}: FestivalCalendarProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  // Schedule form state
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    subject: '',
    scheduled_time: '09:00',
    quote_id: null as string | number | null,
    custom_message: '',
    user_ids: [] as number[],
    selectAll: false,
  });

  // Navigate months
  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    const days: { day: number; month: number; year: number; isCurrentMonth: boolean; dateStr: string }[] = [];
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const month = currentMonth === 0 ? 11 : currentMonth - 1;
      const year = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ day, month, year, isCurrentMonth: false, dateStr });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ day, month: currentMonth, year: currentYear, isCurrentMonth: true, dateStr });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const month = currentMonth === 11 ? 0 : currentMonth + 1;
      const year = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ day, month, year, isCurrentMonth: false, dateStr });
    }
    
    return days;
  }, [currentMonth, currentYear]);

  // Get scheduled emails for a date
  const getScheduledForDate = (dateStr: string): ScheduledEmail[] => {
    return scheduledEmails.filter(e => e.scheduled_date === dateStr);
  };

  // Get holiday for a date
  const getHoliday = (month: number, day: number) => {
    const key = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return COMMON_HOLIDAYS[key];
  };

  // Handle date click
  const handleDateClick = (dateStr: string, month: number, day: number) => {
    setSelectedDate(dateStr);
    const holiday = getHoliday(month, day);
    if (holiday) {
      setScheduleForm(prev => ({
        ...prev,
        title: `${holiday.emoji} ${holiday.name} Email`,
        subject: `${holiday.emoji} Happy ${holiday.name} from QuoteSwipe!`,
      }));
    } else {
      const date = new Date(dateStr);
      setScheduleForm(prev => ({
        ...prev,
        title: `Email for ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        subject: '',
      }));
    }
  };

  // Handle schedule submit
  const handleScheduleSubmit = async () => {
    if (!selectedDate || !scheduleForm.title || !scheduleForm.subject) return;
    if (scheduleForm.user_ids.length === 0 && !scheduleForm.selectAll) return;

    setIsSubmitting(true);
    try {
      await onScheduleEmail({
        title: scheduleForm.title,
        subject: scheduleForm.subject,
        scheduled_date: selectedDate,
        scheduled_time: scheduleForm.scheduled_time,
        quote_id: scheduleForm.quote_id,
        custom_message: scheduleForm.custom_message,
        user_ids: scheduleForm.selectAll ? users.map(u => u.id) : scheduleForm.user_ids,
      });
      
      // Reset form
      setScheduleForm({
        title: '',
        subject: '',
        scheduled_time: '09:00',
        quote_id: null,
        custom_message: '',
        user_ids: [],
        selectAll: false,
      });
      setShowScheduleModal(false);
      setSelectedDate(null);
      onRefresh();
    } catch (error) {
      console.error('Failed to schedule email:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle trigger send
  const handleTriggerSend = async () => {
    if (!onTriggerSend || isTriggering) return;
    
    setIsTriggering(true);
    setTriggerResult(null);
    
    try {
      const result = await onTriggerSend();
      if (result.processed > 0) {
        setTriggerResult(`✅ Sent ${result.processed} email(s)`);
        onRefresh();
      } else {
        setTriggerResult('No pending emails to send');
      }
      
      // Clear message after 3 seconds
      setTimeout(() => setTriggerResult(null), 3000);
    } catch (error) {
      setTriggerResult('❌ Failed to send');
      setTimeout(() => setTriggerResult(null), 3000);
    } finally {
      setIsTriggering(false);
    }
  };

  // Toggle user selection
  const toggleUser = (userId: number) => {
    setScheduleForm(prev => ({
      ...prev,
      user_ids: prev.user_ids.includes(userId)
        ? prev.user_ids.filter(id => id !== userId)
        : [...prev.user_ids, userId],
      selectAll: false,
    }));
  };

  // Selected date details
  const selectedDateObj = selectedDate ? new Date(selectedDate) : null;
  const selectedHoliday = selectedDateObj ? getHoliday(selectedDateObj.getMonth(), selectedDateObj.getDate()) : null;
  const selectedDateScheduled = selectedDate ? getScheduledForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Schedule Calendar</h2>
              <p className="text-sm text-gray-400">Click a date to schedule emails</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Send Pending Button */}
            {onTriggerSend && (
              <button
                onClick={handleTriggerSend}
                disabled={isTriggering}
                className="px-4 py-1.5 text-sm bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 rounded-lg transition-colors flex items-center gap-2"
              >
                {isTriggering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send Now
              </button>
            )}
            {triggerResult && (
              <span className="text-sm text-green-400 animate-pulse">{triggerResult}</span>
            )}
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm bg-amber-600/30 hover:bg-amber-600/50 rounded-lg transition-colors"
            >
              Today
            </button>
            <button onClick={goToPrevMonth} className="p-2 hover:bg-white/10 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-lg min-w-[160px] text-center">
              {MONTHS[currentMonth]} {currentYear}
            </span>
            <button onClick={goToNextMonth} className="p-2 hover:bg-white/10 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {DAYS.map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-400 py-2">
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((item, index) => {
            const isToday = 
              item.day === today.getDate() && 
              item.month === today.getMonth() && 
              item.year === today.getFullYear();
            const holiday = getHoliday(item.month, item.day);
            const scheduled = getScheduledForDate(item.dateStr);
            const isSelected = selectedDate === item.dateStr;
            const isPast = new Date(item.dateStr) < new Date(today.toDateString());

            return (
              <button
                key={index}
                onClick={() => handleDateClick(item.dateStr, item.month, item.day)}
                disabled={isPast && item.isCurrentMonth}
                className={`
                  relative min-h-[80px] p-2 rounded-lg transition-all text-left
                  ${item.isCurrentMonth ? '' : 'opacity-40'}
                  ${isToday ? 'ring-2 ring-amber-500' : ''}
                  ${isSelected ? 'bg-amber-600/40 ring-2 ring-amber-400' : 'hover:bg-white/10'}
                  ${isPast && item.isCurrentMonth ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${holiday ? 'bg-pink-500/10' : 'bg-white/5'}
                `}
              >
                <div className="flex items-start justify-between">
                  <span className={`
                    text-sm font-medium
                    ${isToday ? 'bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                  `}>
                    {item.day}
                  </span>
                  {holiday && (
                    <span className="text-lg" title={holiday.name}>{holiday.emoji}</span>
                  )}
                </div>

                {/* Holiday name */}
                {holiday && item.isCurrentMonth && (
                  <p className="text-[10px] text-pink-400 mt-1 truncate">{holiday.name}</p>
                )}

                {/* Scheduled indicators */}
                {scheduled.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex gap-1">
                      {scheduled.slice(0, 3).map((s, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            s.status === 'sent' ? 'bg-green-500' :
                            s.status === 'failed' ? 'bg-red-500' :
                            'bg-amber-500'
                          }`}
                          title={s.title}
                        />
                      ))}
                      {scheduled.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{scheduled.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" /> Scheduled
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" /> Sent
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> Failed
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-pink-500/20 rounded" /> Holiday
          </div>
        </div>
      </div>

      {/* Selected Date Panel */}
      {selectedDate && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {selectedHoliday && <span className="text-2xl">{selectedHoliday.emoji}</span>}
                {selectedDateObj?.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
              {selectedHoliday && (
                <p className="text-sm text-pink-400">{selectedHoliday.name}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedDate(null)}
              className="p-2 hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scheduled Emails for this date */}
          {selectedDateScheduled.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Scheduled Emails</h4>
              <div className="space-y-2">
                {selectedDateScheduled.map(scheduled => (
                  <div
                    key={scheduled.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        scheduled.status === 'sent' ? 'bg-green-500/20' :
                        scheduled.status === 'failed' ? 'bg-red-500/20' :
                        'bg-amber-500/20'
                      }`}>
                        <Mail className={`w-4 h-4 ${
                          scheduled.status === 'sent' ? 'text-green-400' :
                          scheduled.status === 'failed' ? 'text-red-400' :
                          'text-amber-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{scheduled.title}</p>
                        <p className="text-xs text-gray-400">
                          {scheduled.scheduled_time} • {scheduled.recipient_count} recipients
                        </p>
                      </div>
                    </div>
                    {scheduled.status === 'pending' && (
                      <button
                        onClick={() => onDeleteScheduled(scheduled.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule New Email Button */}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Schedule Email for This Date
          </button>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && selectedDate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900">
              <div>
                <h3 className="text-xl font-bold">Schedule Email</h3>
                <p className="text-sm text-gray-400">
                  {selectedDateObj?.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Christmas Email Campaign"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email Subject *</label>
                <input
                  type="text"
                  value={scheduleForm.subject}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., 🎄 Merry Christmas from QuoteSwipe!"
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Send Time (24-hour format)
                </label>
                <div className="flex gap-2 items-center">
                  {/* Hour */}
                  <select
                    value={scheduleForm.scheduled_time.split(':')[0] || '09'}
                    onChange={(e) => {
                      const minute = scheduleForm.scheduled_time.split(':')[1] || '00';
                      setScheduleForm(prev => ({ 
                        ...prev, 
                        scheduled_time: `${e.target.value}:${minute}` 
                      }));
                    }}
                    className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = String(i).padStart(2, '0');
                      return (
                        <option key={hour} value={hour} className="bg-slate-800">
                          {hour}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-gray-400 text-xl font-bold">:</span>
                  {/* Minute */}
                  <select
                    value={scheduleForm.scheduled_time.split(':')[1] || '00'}
                    onChange={(e) => {
                      const hour = scheduleForm.scheduled_time.split(':')[0] || '09';
                      setScheduleForm(prev => ({ 
                        ...prev, 
                        scheduled_time: `${hour}:${e.target.value}` 
                      }));
                    }}
                    className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                  >
                    {Array.from({ length: 60 }, (_, i) => {
                      const minute = String(i).padStart(2, '0');
                      return (
                        <option key={minute} value={minute} className="bg-slate-800">
                          {minute}
                        </option>
                      );
                    })}
                  </select>
                  <span className="text-sm text-gray-400 ml-2">hrs</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  📅 Scheduled for <span className="text-amber-400 font-mono">{scheduleForm.scheduled_time}</span> hours
                </p>
              </div>

              {/* Quote Selection */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Select Quote (Optional)</label>
                <select
                  value={scheduleForm.quote_id || ''}
                  onChange={(e) => setScheduleForm(prev => ({ 
                    ...prev, 
                    quote_id: e.target.value ? Number(e.target.value) : null 
                  }))}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No quote</option>
                  {quotes.slice(0, 50).map(quote => (
                    <option key={quote.id} value={quote.id}>
                      {quote.text.substring(0, 50)}{quote.author ? `... — ${quote.author}` : '...'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Custom Message (Optional)</label>
                <textarea
                  value={scheduleForm.custom_message}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, custom_message: e.target.value }))}
                  placeholder="Add a personal message..."
                  rows={3}
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">
                    <Users className="w-4 h-4 inline mr-1" />
                    Recipients *
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.selectAll}
                      onChange={(e) => setScheduleForm(prev => ({
                        ...prev,
                        selectAll: e.target.checked,
                        user_ids: e.target.checked ? [] : prev.user_ids,
                      }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm">Select All ({users.length})</span>
                  </label>
                </div>
                
                {!scheduleForm.selectAll && (
                  <div className="max-h-[200px] overflow-y-auto space-y-1 bg-white/5 rounded-lg p-2">
                    {users.map(user => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          scheduleForm.user_ids.includes(user.id)
                            ? 'bg-amber-600/30'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={scheduleForm.user_ids.includes(user.id)}
                          onChange={() => toggleUser(user.id)}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  {scheduleForm.selectAll 
                    ? `All ${users.length} users selected` 
                    : `${scheduleForm.user_ids.length} users selected`}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={isSubmitting || !scheduleForm.title || !scheduleForm.subject || 
                  (scheduleForm.user_ids.length === 0 && !scheduleForm.selectAll)}
                className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Schedule Email
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

