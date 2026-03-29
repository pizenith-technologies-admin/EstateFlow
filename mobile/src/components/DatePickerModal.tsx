import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface Props {
  visible: boolean;
  value: string; // YYYY-MM-DD or ''
  onConfirm: (date: string) => void;
  onDismiss: () => void;
  minDate?: Date;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYMD(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + 'T00:00:00');
  return isNaN(d.getTime()) ? null : d;
}

function buildWeeks(year: number, month: number): (number | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function DatePickerModal({ visible, value, onConfirm, onDismiss, minDate }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const min = minDate ?? today;

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    if (!visible) return;
    const parsed = parseYMD(value);
    setSelected(parsed);
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
  }, [visible]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = () => {
    const minMonth = new Date(min.getFullYear(), min.getMonth(), 1);
    const prevMonth = new Date(viewYear, viewMonth - 1, 1);
    return prevMonth >= minMonth;
  };

  const handleDayPress = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (d < min) return;
    setSelected(d);
  };

  const weeks = buildWeeks(viewYear, viewMonth);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>

          {/* Month navigation */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goToPrevMonth}
              disabled={!canGoPrev()}
              style={styles.navBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.navArrow, !canGoPrev() && styles.navArrowDisabled]}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>

            <TouchableOpacity
              onPress={goToNextMonth}
              style={styles.navBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week headers */}
          <View style={styles.dayHeaderRow}>
            {DAY_LABELS.map(d => (
              <Text key={d} style={styles.dayHeaderText}>{d}</Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.grid}>
            {weeks.map((week, wi) => (
              <View key={wi} style={styles.weekRow}>
                {week.map((day, di) => {
                  if (!day) return <View key={di} style={styles.dayCell} />;

                  const cellDate = new Date(viewYear, viewMonth, day);
                  const isPast = cellDate < min;
                  const isSelected =
                    selected?.getFullYear() === viewYear &&
                    selected?.getMonth() === viewMonth &&
                    selected?.getDate() === day;
                  const isTodayCell =
                    today.getFullYear() === viewYear &&
                    today.getMonth() === viewMonth &&
                    today.getDate() === day;

                  return (
                    <TouchableOpacity
                      key={di}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        isTodayCell && !isSelected && styles.dayCellToday,
                      ]}
                      onPress={() => handleDayPress(day)}
                      disabled={isPast}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.dayText,
                        isPast && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                        isTodayCell && !isSelected && styles.dayTextToday,
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selected && styles.confirmBtnDisabled]}
              onPress={() => selected && onConfirm(toYMD(selected))}
              disabled={!selected}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: { padding: 4 },
  navArrow: { fontSize: 26, color: '#1e40af', lineHeight: 30 },
  navArrowDisabled: { color: '#cbd5e1' },
  monthLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  dayHeaderRow: { flexDirection: 'row', marginBottom: 6 },
  dayHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  grid: { marginBottom: 4 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellSelected: { backgroundColor: '#1e40af' },
  dayCellToday: { borderWidth: 1.5, borderColor: '#1e40af' },
  dayText: { fontSize: 14, color: '#1e293b' },
  dayTextDisabled: { color: '#cbd5e1' },
  dayTextSelected: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: '#1e40af', fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#1e40af',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
