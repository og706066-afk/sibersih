import React, { useState, useEffect } from 'react';
import {
  Receipt,
  CheckCircle2,
  Search,
  User,
  FileCheck,
  Ban,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  Textarea,
  LoadingState,
  EmptyState,
} from '../../components/common';
import { DataService } from '../../services/dataService';
import { useAuth } from '../../contexts/AuthContext';
import type { Penalty } from '../../types';

const generateReceiptId = () => `RCP-${Math.floor(100000 + Math.random() * 900000)}`;

export const PenaltiesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Payment Confirmation Modal
  const [payingPenalty, setPayingPenalty] = useState<Penalty | null>(null);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Cancellation Modal
  const [cancellingPenalty, setCancellingPenalty] = useState<Penalty | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelModalError, setCancelModalError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadPenalties = async () => {
    try {
      const data = await DataService.getPenalties();
      setPenalties(data);
    } catch (err) {
      console.error('Failed to load penalties', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPenalties();
  }, []);

  const handleOpenPayModal = (penalty: Penalty) => {
    setPayingPenalty(penalty);
    setReceiptNumber(generateReceiptId());
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPenalty) return;

    setIsProcessing(true);
    setFeedbackMessage(null);
    try {
      await DataService.updatePenaltyStatus(
        payingPenalty.id,
        'paid',
        currentUser?.displayName || 'Petugas Kebersihan',
        receiptNumber
      );
      setFeedbackMessage({
        type: 'success',
        text: `Denda ${payingPenalty.className || 'Umum'} sebesar Rp ${payingPenalty.amount.toLocaleString('id-ID')} berhasil dilunasi. No Kuitansi: ${receiptNumber}`,
      });
      setPayingPenalty(null);
      await loadPenalties();
    } catch (err: any) {
      console.error('Failed to pay penalty', err);
      setFeedbackMessage({
        type: 'error',
        text: err?.message || 'Gagal memproses pelunasan denda.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCancelModal = (penalty: Penalty) => {
    setCancellingPenalty(penalty);
    setCancellationReason('');
    setCancelModalError(null);
  };

  const handleConfirmCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPenalty) return;

    const trimmedReason = cancellationReason.trim();
    if (!trimmedReason) {
      setCancelModalError('Alasan pembatalan denda wajib diisi.');
      return;
    }

    setIsCancelling(true);
    setCancelModalError(null);
    setFeedbackMessage(null);
    try {
      await DataService.cancelPenalty(
        cancellingPenalty.id,
        currentUser?.uid || 'cleaner-1',
        currentUser?.displayName || 'Petugas Kebersihan',
        trimmedReason
      );
      setFeedbackMessage({
        type: 'success',
        text: `Denda ${cancellingPenalty.className || 'Umum'} (Rp ${cancellingPenalty.amount.toLocaleString('id-ID')}) beserta pelanggaran terkait berhasil dibatalkan.`,
      });
      setCancellingPenalty(null);
      setCancellationReason('');
      setCancelModalError(null);
      await loadPenalties();
    } catch (err: any) {
      console.error('Failed to cancel penalty', err);
      const errorMsg = err?.message || 'Gagal membatalkan denda.';
      setCancelModalError(errorMsg);
      setFeedbackMessage({
        type: 'error',
        text: errorMsg,
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Memuat catatan denda kebersihan..." />;
  }

  const filteredPenalties = penalties.filter((p) => {
    const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
    const matchesSearch =
      (p.className && p.className.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.responsiblePerson && p.responsiblePerson.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.cancellationReason && p.cancellationReason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalPendingAmount = penalties
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900">Manajemen Denda Kebersihan</h2>
        <p className="text-xs text-slate-500">Pencatatan, pelunasan & pembatalan kas sanksi kebersihan</p>
      </div>

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-in fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedbackMessage.text}</span>
        </div>
      )}

      {/* Summary Card */}
      <Card className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider">
              Total Denda Belum Terbayar
            </span>
            <div className="text-2xl font-black mt-0.5">
              Rp {totalPendingAmount.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-amber-100 mt-1">
              Dari {penalties.filter((p) => p.status === 'pending').length} sanksi aktif
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
            <Receipt className="w-6 h-6 text-white" />
          </div>
        </div>
      </Card>

      {/* Filter and Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari kelas, nama, atau alasan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Semua ({penalties.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Belum Lunas ({penalties.filter((p) => p.status === 'pending').length})
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === 'paid'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Lunas ({penalties.filter((p) => p.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilterStatus('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterStatus === 'cancelled'
                ? 'bg-slate-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
            }`}
          >
            Dibatalkan ({penalties.filter((p) => p.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Penalties List */}
      {filteredPenalties.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-8 h-8" />}
          title="Tidak Ada Data Denda"
          description="Tidak ditemukan catatan denda yang cocok dengan kriteria pencarian Anda."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredPenalties.map((pen) => (
            <Card key={pen.id} className="p-3.5 bg-white flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {pen.className || 'Umum'}
                    </span>
                    <Badge
                      variant={
                        pen.status === 'paid'
                          ? 'success'
                          : pen.status === 'cancelled'
                          ? 'neutral'
                          : 'warning'
                      }
                      size="sm"
                    >
                      {pen.status === 'paid'
                        ? 'Lunas'
                        : pen.status === 'cancelled'
                        ? 'Dibatalkan'
                        : 'Belum Lunas'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    <User className="w-3 h-3" /> {pen.responsiblePerson || 'Penanggung Jawab'}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`text-sm font-extrabold ${
                      pen.status === 'cancelled'
                        ? 'text-slate-400 line-through'
                        : 'text-slate-900'
                    }`}
                  >
                    Rp {pen.amount.toLocaleString('id-ID')}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">{pen.issuedDate}</div>
                </div>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-2.5">
                <p className="font-medium">{pen.reason}</p>
                {pen.receiptNumber && pen.status === 'paid' && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" /> No. Kuitansi: {pen.receiptNumber}
                  </p>
                )}
              </div>

              {/* Cancellation Info Box if cancelled */}
              {pen.status === 'cancelled' && (
                <div className="text-xs bg-rose-50/70 p-2.5 rounded-xl border border-rose-200/80 mt-2.5 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                    <Ban className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>Denda Dibatalkan</span>
                  </div>
                  <p className="text-[11px] text-rose-700">
                    <span className="font-medium">Alasan:</span> {pen.cancellationReason || 'Tanpa keterangan'}
                  </p>
                  {pen.cancelledByName && (
                    <p className="text-[10px] text-rose-600">
                      Oleh: {pen.cancelledByName} • {pen.cancelledAt ? new Date(pen.cancelledAt).toLocaleDateString('id-ID') : '-'}
                    </p>
                  )}
                </div>
              )}

              {/* Actions: Show when NOT cancelled */}
              {pen.status !== 'cancelled' && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<Ban className="w-3.5 h-3.5 text-rose-600" />}
                    onClick={() => handleOpenCancelModal(pen)}
                    className="text-rose-700 hover:bg-rose-50 border-rose-200"
                  >
                    Batalkan
                  </Button>
                  {pen.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="primary"
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenPayModal(pen)}
                    >
                      Tandai Lunas
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Pelunasan Denda */}
      <Modal
        isOpen={Boolean(payingPenalty)}
        onClose={() => setPayingPenalty(null)}
        title="Konfirmasi Pelunasan Denda"
        description="Penerimaan pembayaran denda kas kebersihan pondok"
      >
        <form onSubmit={handleConfirmPayment} className="space-y-3.5">
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
            <span className="text-xs text-amber-800 font-medium">Nominal Pembayaran:</span>
            <div className="text-xl font-black text-amber-900 mt-0.5">
              Rp {payingPenalty?.amount.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-amber-700 mt-1">
              Untuk: {payingPenalty?.className} ({payingPenalty?.responsiblePerson})
            </p>
          </div>

          <Input
            label="Nomor Kuitansi / Bukti Pembayaran"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            required
          />

          <Input
            label="Diterima Oleh (Petugas)"
            value={currentUser?.displayName || 'Petugas Kebersihan'}
            disabled
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayingPenalty(null)}
              disabled={isProcessing}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isLoading={isProcessing}>
              Konfirmasi & Terbitkan Kuitansi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Pembatalan Denda */}
      <Modal
        isOpen={Boolean(cancellingPenalty)}
        onClose={() => setCancellingPenalty(null)}
        title="Batalkan Denda Kebersihan"
        description="Pembatalan tagihan denda dan pemutakhiran status pelanggaran terkait"
      >
        <form onSubmit={handleConfirmCancellation} className="space-y-3.5">
          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200 space-y-1.5">
            <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Perhatian: Pembatalan Permanen Status</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              Membatalkan denda sebesar <strong className="font-extrabold text-rose-900">Rp {cancellingPenalty?.amount.toLocaleString('id-ID')}</strong> untuk <strong>{cancellingPenalty?.className}</strong> ({cancellingPenalty?.responsiblePerson}).
            </p>
            <p className="text-[11px] text-rose-600">
              Status denda dan catatan pelanggaran terkait akan otomatis diubah menjadi <strong>"Dibatalkan"</strong>. Data riwayat tetap tersimpan utuh di sistem untuk keperluan audit.
            </p>
          </div>

          <Textarea
            label="Alasan Pembatalan *"
            placeholder="Tuliskan alasan pembatalan (misal: klarifikasi wali santri, kesalahan input data, dsb)..."
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            required
          />

          <Input
            label="Dibatalkan Oleh (Petugas)"
            value={currentUser?.displayName || 'Petugas Kebersihan'}
            disabled
          />

          {cancelModalError && (
            <div className="p-3 bg-rose-100 text-rose-800 rounded-xl text-xs border border-rose-300 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Pembatalan Gagal</p>
                <p className="text-[11px] mt-0.5">{cancelModalError}</p>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancellingPenalty(null)}
              disabled={isCancelling}
            >
              Batal
            </Button>
            <Button type="submit" variant="danger" isLoading={isCancelling}>
              Konfirmasi Pembatalan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
