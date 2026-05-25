"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Shield, Lock, Zap, Eye, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Privacy-First Architecture",
    description:
      "AES-256-GCM encrypted metadata stored on IPFS. Video URLs never exposed to the frontend.",
    color: "from-cyan-500 to-blue-600",
  },
  {
    icon: Lock,
    title: "Wallet-Gated Access",
    description:
      "On-chain access expiry enforced by smart contract. Only verified buyers can decrypt content.",
    color: "from-purple-500 to-pink-600",
  },
  {
    icon: Zap,
    title: "Arbitrum Sepolia",
    description:
      "Low-cost, fast transactions on Arbitrum L2. Automatic 90/10 payment split on-chain.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Eye,
    title: "Revenue Cap System",
    description:
      "Campaigns auto-close at $20 gross revenue. Existing buyers retain access until expiry.",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-[85vh] px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Live on Mezo Testnet · Privacy-First Architecture
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none"
        >
          <span className="gradient-text">PrivateStream</span>
          <br />
          <span className="text-white">Mezo</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10 leading-relaxed"
        >
          Privacy-preserving encrypted video access platform on Mezo.
          Creators monetize content with wallet-gated decryption and
          automatic revenue caps — powered by privacy-first architecture.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/marketplace"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold hover:from-cyan-400 hover:to-purple-500 transition-all shadow-lg shadow-purple-500/20"
          >
            Browse Marketplace
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/campaign/create"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-semibold hover:bg-white/10 transition-all"
          >
            Create Campaign
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 grid grid-cols-3 gap-8 text-center"
        >
          {[
            { label: "Revenue Cap", value: "$20" },
            { label: "Platform Fee", value: "10%" },
            { label: "Creator Share", value: "90%" },
          ].map(({ label, value }) => (
            <div key={label}>
              <div className="text-2xl font-bold gradient-text">{value}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl font-bold text-center mb-12 gradient-text"
        >
          Privacy-First Architecture
        </motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          {features.map(({ icon: Icon, title, description, color }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:border-white/20 transition-all group"
            >
              <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${color} mb-4 opacity-80 group-hover:opacity-100 transition-opacity`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>

        {/* Privacy architecture note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 p-6 rounded-2xl bg-purple-500/5 border border-purple-500/20 text-center"
        >
          <p className="text-sm text-purple-300 font-medium mb-1">
            🔬 Privacy Architecture Note
          </p>
          <p className="text-xs text-gray-500 max-w-2xl mx-auto">
            This MVP demonstrates encrypted access control on Mezo.
            The architecture is designed for privacy-first video access with wallet-gated decryption.
          </p>
        </motion.div>
      </section>
    </div>
  );
}
