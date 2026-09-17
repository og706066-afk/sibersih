import React, { useState, useRef } from 'react';
import { Camera, User, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../contexts/AuthContext';
import { storage, auth, isFirebaseConfigured } from '../../config/firebase';

interface ProfileAvatarUploaderProps {
  fallbackVariant?: 'cleaner' | 'teacher' | 'admin';
}

export const ProfileAvatarUploader: React.FC<ProfileAvatarUploaderProps> = ({
  fallbackVariant = 'cleaner',
}) => {
  const { currentUser, updateProfilePhoto } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const photoUrl = currentUser?.photoURL || currentUser?.avatarUrl;

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
    if (isUploading) return;
    setFeedback(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so user can re-pick the same file if desired
    e.target.value = '';

    // 1. Validasi tipe file (harus gambar)
    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        text: 'Format file tidak didukung. Harap pilih file gambar (JPG, PNG, atau WEBP).',
      });
      return;
    }

    // 2. Validasi ukuran file (maksimal 2 MB)
    const MAX_SIZE_BYTES = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      setFeedback({
        type: 'error',
        text: 'Ukuran file terlalu besar. Maksimal ukuran foto adalah 2 MB.',
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

    setIsUploading(true);
    setFeedback(null);

    try {
      // Periksa apakah Firebase Live & Storage aktif
      if (isFirebaseConfigured && storage && auth?.currentUser) {
        const fileExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
        const storagePath = `profile_photos/${currentUser.uid}/profile.${fileExt}`;
        const storageRef = ref(storage, storagePath);

        const metadata = {
          contentType: file.type,
          customMetadata: {
            uploadedBy: currentUser.uid,
            uploadedAt: new Date().toISOString(),
          },
        };

        await uploadBytes(storageRef, file, metadata);
        const downloadUrl = await getDownloadURL(storageRef);

        await updateProfilePhoto(downloadUrl);
      } else {
        // Mode Demo / Preview offline: simulasikan upload menggunakan Object URL
        await new Promise((resolve) => setTimeout(resolve, 800));
        const demoUrl = URL.createObjectURL(file);
        await updateProfilePhoto(demoUrl);
      }

      setFeedback({
        type: 'success',
        text: 'Foto profil berhasil diperbarui.',
      });
    } catch (err: any) {
      console.error('Failed to upload profile photo:', err);
      let errorMsg = 'Gagal mengunggah foto profil. Silakan coba lagi.';
      if (err?.code === 'storage/unauthorized') {
        errorMsg = 'Akses ditolak: Anda hanya dapat mengunggah foto profil milik sendiri.';
      } else if (err?.code === 'storage/quota-exceeded') {
        errorMsg = 'Kapasitas penyimpanan Firebase Storage penuh.';
      } else if (err?.message) {
        errorMsg = err.message;
      }
      setFeedback({ type: 'error', text: errorMsg });
    } finally {
      setIsUploading(false);
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

          {/* Loading overlay inside avatar while uploading */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs rounded-full flex items-center justify-center text-white">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        {/* Camera action overlay button */}
        <button
          type="button"
          onClick={handlePickFile}
          disabled={isUploading}
          className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md border-2 border-white transition-all disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
          title="Ubah Foto Profil"
          aria-label="Ubah Foto Profil"
        >
          {isUploading ? (
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
        disabled={isUploading}
      />

      {/* Text button "Ubah Foto" */}
      <button
        type="button"
        onClick={handlePickFile}
        disabled={isUploading}
        className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200/80 rounded-full transition-colors disabled:opacity-50 cursor-pointer"
      >
        <Camera className="w-3 h-3" />
        <span>{isUploading ? 'Mengunggah...' : 'Ubah Foto'}</span>
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
