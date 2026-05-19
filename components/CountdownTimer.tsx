"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  expiresAt: number; // Unix timestamp in seconds
  onExpire?: () => void;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(expiresAt: number): TimeLeft {
  const diff = Math.max(0, expiresAt - Math.floor(Date.now() / 1000));
  return {
    days:    Math.floor(diff / 86400),
    hours:   Math.floor((diff % 86400) / 3600),
    minutes: Math.floor((diff % 3600) / 60),
    seconds: diff % 60,
  };
}

function Digit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-12 h-12 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 overflow-hidden">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="text-lg font-mono font-bold text-cyan-400"
          >
            {String(value).padStart(2, "0")}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className="text-xs text-gray-500 mt-1">{label}</span>
    </div>
  );
}

export default function CountdownTimer({
  expiresAt,
  onExpire,
  className,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calcTimeLeft(expiresAt));
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const t = calcTimeLeft(expiresAt);
      setTimeLeft(t);
      if (t.days === 0 && t.hours === 0 && t.minutes === 0 && t.seconds === 0) {
        setExpired(true);
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (expired) {
    return (
      <div className={cn("flex items-center gap-2 text-red-400 text-sm", className)}>
        <Clock className="w-4 h-4" />
        <span>Access Expired</span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Access expires in</span>
      </div>
      <div className="flex items-end gap-2">
        {timeLeft.days > 0 && <Digit value={timeLeft.days} label="days" />}
        <Digit value={timeLeft.hours} label="hrs" />
        <Digit value={timeLeft.minutes} label="min" />
        <Digit value={timeLeft.seconds} label="sec" />
      </div>
    </div>
  );
}
