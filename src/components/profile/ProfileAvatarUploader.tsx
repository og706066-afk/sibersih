import React, { useState, useRef } from 'react';
import { Camera, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileAvatarUploaderProps {
  fallbackVariant?: 'cleaner' | 'teacher' | 'admin';
}

/**
 * Mengompresi file gambar menjadi data URL JPEG dengan proporsi bujur sangkar (center-crop)
 * dan target ukuran maksimal 200–300 KB sehingga aman disimpan langsung di Firestore /users/{uid}.
 */
async function compressImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error('Gagal membaca file gambar dari perangkat Anda.'));
    };

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error('Format file gambar tidak didukung atau file rusak.'));
      };

      img.onload = () => {
        try {
          const originalWidth = img.naturalWidth || img.width;
          const originalHeight = img.naturalHeight || img.height;

          // 1. Center crop bujur sangkar agar avatar proporsional
          const cropSize = Math.min(originalWidth, originalHeight);
          const startX = Math.floor((originalWidth - cropSize) / 2);
          const startY = Math.floor((originalHeight - cropSize) / 2);

          // 2. Tentukan resolusi awal (360x360 px sangat tajam untuk avatar lingkaran)
          let targetSize = 360;
          let quality = 0.8;

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Browser tidak mendukung akselerasi Canvas untuk memproses gambar.'));
            return;
          }

          // Latar belakang putih jika gambar asal memiliki transparansi (PNG)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetSize, targetSize);
          ctx.drawImage(img, startX, startY, cropSize, cropSize, 0, 0, targetSize, targetSize);

          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          // 3. Iterasi kompresi adaptif jika ukuran base64 > 200 KB
          const MAX_SOFT_BYTES = 200 * 1024; // 200 KB
          let iterations = 0;

          while (dataUrl.length > MAX_SOFT_BYTES && iterations < 4) {
            iterations++;
            targetSize = Math.max(160, Math.floor(targetSize * 0.75));
            quality = Math.max(0.5, quality - 0.15);

            canvas.width = targetSize;
            canvas.height = targetSize;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, targetSize, targetSize);
            ctx.drawImage(img, startX, startY, cropSize, cropSize, 0, 0, targetSize, targetSize);

            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // 4. Batas keras maksimal 300 KB
          const MAX_HARD_BYTES = 300 * 1024; // 300 KB
          if (dataUrl.length > MAX_HARD_BYTES) {
            reject(
              new Error(
                'Ukuran gambar hasil kompresi masih melebihi batas 300 KB. Harap pilih foto lain yang lebih sederhana.'
              )
            );
            return;
          }

          resolve(dataUrl);
        } catch (err: any) {
          reject(new Error(err?.message || 'Terjadi kegagalan saat mengompresi gambar.'));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export const ProfileAvatarUploader: React.FC<ProfileAvatarUploaderProps> = ({
  fallbackVariant = 'cleaner',
}) => {
  const { currentUser, updateProfilePhoto } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Avatar yang ditampilkan: preview lokal baru atau avatar tersimpan di Firestore
  const photoUrl = localPreview || currentUser?.avatarUrl;

  const getFallbackClasses = () => {
    switch (fallbackVariant) {
      case 'admin':
        return 'bg-slate-900 border-slate-700 text-indigo-400';
      case 'teacher':
        return 'bg-indigo-50 border-indigo-200 text-indigo-600';
      case 'cleaner':
      default:
        return 'bg-emerald-50 border-emerald-200 text-emerald-600';
    }
  };

  const handlePickFile = () => {
    if (isProcessing) return;
    setFeedback(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input agar pengguna bisa memilih kembali file yang sama jika diinginkan
    e.target.value = '';

    // 1. Validasi tipe MIME (harus image/*)
    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        text: 'Format file tidak didukung. Harap pilih file gambar (JPG, PNG, atau WEBP).',
      });
      return;
    }

    // 2. Validasi batas ukuran file mentah perangkat (maksimal 10 MB sebelum kompresi)
    const MAX_RAW_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_RAW_SIZE_BYTES) {
      setFeedback({
        type: 'error',
        text: 'Ukuran foto asli terlalu besar (maksimal 10 MB). Harap pilih foto lain.',
      });
      return;
    }

    if (!currentUser?.uid) {
      setFeedback({
        type: 'error',
        text: 'Sesi pengguna tidak valid. Silakan muat ulang halaman.',
      });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);

    try {
      // 3. Kompresi gambar langsung di browser menjadi data URL JPEG ringan (<= 200–300 KB)
      const compressedDataUrl = await compressImageToDataUrl(file);

      // Tampilkan pratinjau instan
      setLocalPreview(compressedDataUrl);

      // 4. Simpan ke Firestore /users/{uid} tanpa menggunakan Firebase Storage
      await updateProfilePhoto(compressedDataUrl);

      setFeedback({
        type: 'success',
        text: 'Foto profil berhasil diperbarui.',
      });
    } catch (err: any) {
      console.error('Failed to compress or save profile photo:', err);
      // Batalkan preview jika gagal menyimpan
      setLocalPreview(null);
      setFeedback({
        type: 'error',
        text: err?.message || 'Gagal memperbarui foto profil. Silakan coba lagi.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center mb-3">
      {/* Avatar Container */}
      <div className="relative group">
        <div
          className={`w-24 h-24 rounded-full overflow-hidden border-2 shadow-xs flex items-center justify-center transition-all ${
            photoUrl ? 'border-emerald-300 bg-slate-100' : getFallbackClasses()
          }`}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={currentUser?.displayName || 'Foto Profil'}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-12 h-12" />
          )}

          {/* Loading overlay inside avatar while processing */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-full flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        {/* Camera action overlay button */}
        <button
          type="button"
          onClick={handlePickFile}
          disabled={isProcessing}
          className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md border-2 border-white transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
          title="Ubah Foto Profil"
          aria-label="Ubah Foto Profil"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Camera className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
      />

      {/* Text button "Ubah Foto" */}
      <button
        type="button"
        onClick={handlePickFile}
        disabled={isProcessing}
        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200/80 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Camera className="w-3 h-3" />
        <span>{isProcessing ? 'Menyimpan...' : 'Ubah Foto'}</span>
      </button>

      {/* Feedback message */}
      {feedback && (
        <div
          className={`mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all max-w-[280px] text-left ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
          )}
          <span className="leading-snug">{feedback.text}</span>
        </div>
      )}
    </div>
  );
};
