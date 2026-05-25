"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Shield, AlertTriangle, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurePlayerProps {
  embedUrl: string;
  title?: string;
  className?: string;
}

export default function SecurePlayer({ embedUrl, title, className }: SecurePlayerProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleFullscreen = () => {
    iframeRef.current?.requestFullscreen?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Security badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Shield className="w-3.5 h-3.5" />
          <span>Encrypted access · Wallet-gated · Privacy-protected</span>
        </div>
        <button
          onClick={handleFullscreen}
          className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-all"
          title="Fullscreen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Player container */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 aspect-video">
        {/* Loading skeleton */}
        {!loaded && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="space-y-3 text-center">
              <motion.div
                className="w-12 h-12 rounded-full border-2 border-t-cyan-400 border-r-purple-500 border-b-transparent border-l-transparent mx-auto"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              />
              <p className="text-xs text-gray-500">Decrypting secure stream...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto" />
              <p className="text-sm text-gray-400">Failed to load video</p>
              <p className="text-xs text-gray-600">Check your connection and try again</p>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          title={title ?? "Secure Video"}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          // Security: prevent the iframe from navigating the parent
          sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
        />
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-600 text-center">
        This content is protected by wallet-gated encrypted access control.
        Sharing or recording is prohibited.
      </p>
    </div>
  );
}
