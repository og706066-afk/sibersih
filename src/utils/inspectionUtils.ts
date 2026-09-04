import type { CleanlinessGrade } from '../types';

// ============================================================
// STANDAR SISTEM SKORING SIBERSIH
// Lolos = 100 | Gagal = 40
// Threshold: >=85 Bersih, 75-84 Cukup, 60-74 Kotor, <60 Kritis
// ============================================================
export const CHECKLIST_PASS_SCORE = 100;
export const CHECKLIST_FAIL_SCORE = 40;

export const calculateInspectionScore = (
  items: Array<{ passed: boolean; score?: number }>
): number => {
  if (!items || items.length === 0) return 0;
  const total = items.reduce((acc, curr) => {
    const itemScore = curr.passed ? CHECKLIST_PASS_SCORE : CHECKLIST_FAIL_SCORE;
    return acc + itemScore;
  }, 0);
  return Math.round(total / items.length);
};

export const getCleanlinessGrade = (score: number): CleanlinessGrade => {
  if (score >= 85) return 'clean';
  if (score >= 75) return 'moderate';
  if (score >= 60) return 'dirty';
  return 'critical';
};

// Helper: Menghasilkan deskripsi/keterangan standar penilaian indikator
export const getIndicatorDescription = (name: string): string => {
  const lower = name.toLowerCase();
  if (lower.includes('lantai')) {
    return 'Tidak terdapat sampah, debu, atau kotoran yang terlihat.';
  }
  if (lower.includes('meja') || lower.includes('kursi') || lower.includes('mebel') || lower.includes('kerapian')) {
    return 'Meja dan kursi bersih, rapi, dan tidak berdebu.';
  }
  if (lower.includes('papan') || lower.includes('dinding') || lower.includes('penghapus')) {
    return 'Papan tulis bersih dan dinding tidak memiliki coretan.';
  }
  if (lower.includes('sampah')) {
    return 'Tempat sampah tersedia dan tidak dalam kondisi penuh.';
  }
  if (lower.includes('jendela') || lower.includes('pintu') || lower.includes('ventilasi')) {
    return 'Kaca jendela bersih dan ventilasi udara bebas dari debu tebal.';
  }
  return 'Kondisi area memenuhi standar kebersihan dan kerapian lingkungan pesantren.';
};
