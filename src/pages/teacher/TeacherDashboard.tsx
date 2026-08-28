import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  Receipt,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Card, Button, Badge, LoadingState, EmptyState } from '../../components/common';

import { DataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import type {
  ClassRoom,
  Inspection,
  Violation,
  Penalty,
  TeacherClassAssignment,
} from '../../types';

export const TeacherDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<TeacherClassAssignment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);

  useEffect(() => {
    const loadTeacherData = async () => {
      try {
        const [cls, assign] = await Promise.all([
          DataService.getClasses(),
          DataService.getTeacherAssignments(currentUser?.uid),
        ]);
        setClasses(cls);
        setAssignments(assign);

        // FIX 1: If teacher has no class assignment, do not query any class data to prevent PERMISSION_DENIED
        if (assign.length === 0) {
          setIsLoading(false);
          return;
        }

        // TODO: Multi-class selector if teacher has multiple assignments
        const assignedClassId = assign[0].classId;

        const [insp, viol, pen] = await Promise.all([
          DataService.getInspections(assignedClassId),
          DataService.getViolations(assignedClassId),
          DataService.getPenalties(assignedClassId),
        ]);
        setInspections(insp);
        setViolations(viol);
        setPenalties(pen);
      } catch (err) {
        console.error('Failed to load teacher data', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTeacherData();
  }, [currentUser]);

  if (isLoading) {
    return <LoadingState message="Memuat pantauan kelas santri..." />;
  }

  // FIX 1: If no assignment, render informative EmptyState without attempting to read class-1
  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pantauan Kelas Santri</h2>
          <p className="text-xs text-slate-500">Monitoring kondisi kebersihan ruang kelas</p>
        </div>
        <EmptyState
          icon={<GraduationCap className="w-8 h-8 text-slate-400" />}
          title="Belum Ada Penugasan Kelas"
          description="Anda belum ditugaskan sebagai wali kelas. Silakan hubungi bagian administrasi pesantren."
        />
      </div>
    );
  }

  // TODO: Multi-class selector if teacher has multiple assignments
  const assignedClassId = assignments[0].classId;
  const assignedClass = classes.find((c) => c.id === assignedClassId) || {
    id: assignedClassId,
    name: assignments[0].className || 'Kelas Binaan',
    grade: '',
    isActive: true,
    createdAt: '',
    updatedAt: '',
  };


  // Filter inspections for this class or its area
  const classInspections = inspections.filter(
    (i) => i.classId === assignedClass?.id || i.areaName.includes(assignedClass?.name || '')
  );

  const latestInspection = classInspections.length > 0 ? classInspections[0] : null;

  // Filter violations and penalties for this class
  const classViolations = violations.filter(
    (v) => v.classId === assignedClass?.id || v.className?.includes(assignedClass?.name || '')
  );

  const classPenalties = penalties.filter(
    (p) => p.classId === assignedClass?.id || p.className?.includes(assignedClass?.name || '')
  );

  const pendingClassPenalties = classPenalties.filter((p) => p.status === 'pending');
  const totalPendingFines = pendingClassPenalties.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Teacher Class Header Card */}
      <div className="bg-gradient-to-br from-indigo-800 to-slate-900 rounded-2xl p-4 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Wali Kelas
            </span>
            <span className="text-[11px] bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-xs text-indigo-200">
              Tahun Ajaran 2026/2027
            </span>
          </div>

          <h2 className="text-xl font-bold mt-1">Kelas {assignedClass?.name || 'X IPA 1'}</h2>
          <p className="text-xs text-indigo-200 mt-0.5">
            {assignedClass?.building || 'Gedung Umar bin Khattab'}
          </p>

          <div className="mt-3.5 pt-3 border-t border-indigo-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-300 uppercase">Status Kebersihan Hari Ini</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {latestInspection?.overallGrade === 'clean' ? (
                  <Badge variant="success" size="sm">Bersih & Rapi</Badge>
                ) : latestInspection?.overallGrade === 'moderate' ? (
                  <Badge variant="warning" size="sm">Perlu Perhatian</Badge>
                ) : (
                  <Badge variant="danger" size="sm">Kotor / Perlu Tindakan</Badge>
                )}
                <span className="text-sm font-black text-white ml-1">
                  {latestInspection ? `${latestInspection.totalScore}%` : 'Belum Diperiksa'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-indigo-300 uppercase">Denda Kelas</span>
              <div className="text-sm font-bold text-amber-300 mt-0.5">
                Rp {totalPendingFines.toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Info Notice for Teacher: Read Only mode explanation */}
      <div className="bg-sky-50 border border-sky-200/80 p-3 rounded-2xl flex items-start gap-2.5">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900">
          <span className="font-bold">Akses Pemantauan Ustadz/Ustadzah (Read-Only)</span>
          <p className="text-sky-700 mt-0.5">
            Anda dapat memantau hasil inspeksi kebersihan dan riwayat denda santri kelas binaan. Evaluasi dan sanksi dikelola langsung oleh Tim Kebersihan Pondok.
          </p>
        </div>
      </div>

      {/* Today's Cleanliness Condition */}
      <Card className="p-4 bg-white">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Inspeksi Terakhir</h3>
          </div>
          <span className="text-xs text-slate-400">
            {latestInspection ? latestInspection.date : 'Hari ini'}
          </span>
        </div>

        {latestInspection ? (
          <div className="mt-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Petugas Pemeriksa:</span>
              <span className="text-xs font-semibold text-slate-800">{latestInspection.inspectorName}</span>
            </div>

            {latestInspection.notes && (
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                <span className="font-bold text-slate-700 block mb-0.5">Catatan Tim Kebersihan:</span>
                "{latestInspection.notes}"
              </div>
            )}

            {latestInspection.hasViolations && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Ditemukan Pelanggaran Piket</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 py-0 border-rose-300 text-rose-700 hover:bg-rose-100/50"
                  onClick={() => navigate('/teacher/violations')}
                >
                  Rincian
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3 text-center">
            Belum ada data pemeriksaan terbaru untuk kelas ini hari ini.
          </p>
        )}
      </Card>

      {/* Quick Navigation / Summary cards */}
      <div className="grid grid-cols-2 gap-2.5">
        <Card
          hoverEffect
          onClick={() => navigate('/teacher/history')}
          className="p-3 bg-white border-slate-200/90 flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
              <Calendar className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Riwayat Nilai</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {classInspections.length} catatan checklist
            </p>
          </div>
          <span className="text-xs text-indigo-600 font-semibold mt-3 flex items-center gap-1">
            Buka Riwayat <ArrowRight className="w-3 h-3" />
          </span>
        </Card>

        <Card
          hoverEffect
          onClick={() => navigate('/teacher/violations')}
          className="p-3 bg-white border-slate-200/90 flex flex-col justify-between"
        >
          <div>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <Receipt className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Sanksi & Denda</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {pendingClassPenalties.length} denda tertunda ({classViolations.length} pelanggaran)
            </p>

          </div>
          <span className="text-xs text-amber-600 font-semibold mt-3 flex items-center gap-1">
            Lihat Sanksi <ArrowRight className="w-3 h-3" />
          </span>
        </Card>
      </div>
    </div>
  );
};
