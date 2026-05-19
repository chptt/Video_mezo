"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimeRemaining } from "@/lib/access";

interface AccessBadgeProps {
  hasAccess: boolean;
  expiresAt?: number;
  className?: string;
}

export default function AccessBadge({ hasAccess, expiresAt, className }: AccessBadgeProps) {
  const now = Math.floor(Date.now() / 1000);
  const isExpired = expiresAt ? expiresAt <= now : true;

  if (!hasAccess || isExpired) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
          "bg-red-500/10 border border-red-500/30 text-red-400",
          className
        )}
      >
        <ShieldX className="w-3.5 h-3.5" />
        No Access
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
        "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400",
        className
      )}
    >
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>Access Active</span>
      {expiresAt && (
        <>
          <span className="text-emerald-600">·</span>
          <Clock className="w-3 h-3" />
          <span>{formatTimeRemaining(expiresAt)}</span>
        </>
      )}
    </motion.div>
  );
}
