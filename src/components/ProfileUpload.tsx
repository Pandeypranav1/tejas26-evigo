"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { updateDemoUserProfileImage } from "@/lib/demoStore";

export function ProfileUpload() {
  const { user } = useAuth();
  const [imagePreview, setImagePreview] = useState<string | null>(user?.profileImage || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setIsUploading(true);

        // Simulate network upload
        setTimeout(() => {
          updateDemoUserProfileImage(base64);
          setIsUploading(false);
          window.location.reload();
        }, 800);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    if (!imagePreview) return;
    setImagePreview(null);
    updateDemoUserProfileImage("");
    window.location.reload();
  };

  const initial = user?.phone ? user.phone.charAt(0).toUpperCase() : "U";

  return (
    <div className="flex flex-col items-center">
      <div 
        className="group relative cursor-pointer"
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="relative w-[80px] h-[80px] sm:w-[100px] sm:h-[100px] rounded-full p-1 bg-gradient-to-tr from-violet-600 to-cyan-500 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] shadow-[0_0_15px_rgba(139,92,246,0.3)]">
          <div className="w-full h-full rounded-full overflow-hidden bg-[#0f0a1e] border-2 border-white/10 relative flex items-center justify-center">
            {imagePreview ? (
              <img src={imagePreview} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl sm:text-4xl font-black text-white bg-gradient-to-tr from-violet-600/20 to-cyan-500/20 w-full h-full flex items-center justify-center">
                {initial}
              </span>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <span className="block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              </div>
            )}
          </div>
        </div>

        {/* Edit Icon Overlay */}
        <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 text-white flex items-center justify-center shadow-lg border-2 border-[#0b0416] transition-transform duration-300 group-hover:scale-110">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>

        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileChange} 
          disabled={isUploading}
        />
      </div>

      <div className="mt-3 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -bottom-8">
        {imagePreview && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleRemovePhoto();
            }}
            className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors uppercase tracking-wider bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-md"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
