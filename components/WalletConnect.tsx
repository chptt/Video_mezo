"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, LogOut, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { cn, shortenAddress } from "@/lib/utils";
import toast from "react-hot-toast";

interface WalletConnectProps {
  className?: string;
  compact?: boolean;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export function useWallet() {
  const [address, setAddress]   = useState<string | null>(null);
  const [chainId, setChainId]   = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);

  const REQUIRED_CHAIN = 421614;

  useEffect(() => {
    // Restore session only if user hasn't manually disconnected
    const wasDisconnected = sessionStorage.getItem("ps_disconnected") === "true";
    if (typeof window !== "undefined" && window.ethereum && !wasDisconnected) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          const accs = accounts as string[];
          if (accs.length > 0) setAddress(accs[0]);
        })
        .catch(() => {});

      window.ethereum
        .request({ method: "eth_chainId" })
        .then((id) => setChainId(parseInt(id as string, 16)))
        .catch(() => {});
    }

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        setAddress(accs.length > 0 ? accs[0] : null);
      };
      const handleChainChanged = (id: unknown) => {
        setChainId(parseInt(id as string, 16));
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not detected. Please install MetaMask.");
      return;
    }
    setLoading(true);
    // Clear the disconnected flag so session restores on next reload
    sessionStorage.removeItem("ps_disconnected");
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];
      setAddress(accounts[0]);

      // Always try to add Arbitrum Sepolia first, then switch
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x66EEE",
            chainName: "Arbitrum Sepolia",
            nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
            blockExplorerUrls: ["https://sepolia.arbiscan.io"],
          }],
        });
      } catch {
        // wallet_addEthereumChain may throw if already added — that's fine
      }

      // Now switch to it
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x66EEE" }], // Arbitrum Sepolia 421614
        });
      } catch (switchErr: unknown) {
        const code = (switchErr as { code?: number }).code;
        if (code !== 4001) {
          // Not user-rejected — show warning but don't block
          toast.error("Please switch to Arbitrum Sepolia in MetaMask");
        }
      }

      // Verify we are on the right chain
      const currentChain = await window.ethereum.request({ method: "eth_chainId" }) as string;
      const currentChainId = parseInt(currentChain, 16);
      setChainId(currentChainId);

      if (currentChainId !== 421614) {
        toast.error("Wrong network — please switch to Arbitrum Sepolia (Chain ID 421614)");
      } else {
        toast.success("Wallet connected to Arbitrum Sepolia!");
      }
    } catch (err: unknown) {
      if ((err as { code: number }).code !== 4001) {
        toast.error("Failed to connect wallet");
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    // MetaMask does not expose a programmatic disconnect API.
    // We clear local state and set a flag so the app won't auto-reconnect on reload.
    setAddress(null);
    setChainId(null);
    sessionStorage.setItem("ps_disconnected", "true");
    toast.success("Wallet disconnected");
  };

  const switchToArbitrum = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: "0x66EEE",
          chainName: "Arbitrum Sepolia",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
          blockExplorerUrls: ["https://sepolia.arbiscan.io"],
        }],
      });
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x66EEE" }],
      });
      toast.success("Switched to Arbitrum Sepolia!");
    } catch {
      toast.error("Could not switch network — please switch manually in MetaMask");
    }
  };

  const isCorrectChain = chainId === REQUIRED_CHAIN;

  return { address, chainId, loading, connect, disconnect, switchToArbitrum, isCorrectChain };
}

export default function WalletConnect({ className, compact = false }: WalletConnectProps) {
  const { address, loading, connect, disconnect, switchToArbitrum, isCorrectChain } = useWallet();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!address) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={connect}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm",
          "bg-gradient-to-r from-cyan-500 to-purple-600 text-white",
          "hover:from-cyan-400 hover:to-purple-500 transition-all",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      >
        <Wallet className="w-4 h-4" />
        {loading ? "Connecting..." : "Connect Wallet"}
      </motion.button>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {!isCorrectChain && (
          <button
            onClick={switchToArbitrum}
            className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/20 hover:bg-yellow-400/20 transition-all"
          >
            ⚠ Switch to Arbitrum Sepolia
          </button>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          {shortenAddress(address)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!isCorrectChain && (
        <button
          onClick={switchToArbitrum}
          className="text-xs text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-full border border-yellow-400/20 hover:bg-yellow-400/20 transition-all w-fit"
        >
          ⚠ Wrong Network — Click to Switch to Arbitrum Sepolia
        </button>
      )}
      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
        <div className={cn("w-2 h-2 rounded-full mr-1", isCorrectChain ? "bg-emerald-400" : "bg-yellow-400")} />
        <span className="text-sm text-gray-300 font-mono">{shortenAddress(address)}</span>
        <button onClick={copyAddress} className="ml-1 p-1 hover:text-cyan-400 transition-colors text-gray-500">
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={`https://sepolia.arbiscan.io/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:text-cyan-400 transition-colors text-gray-500"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={disconnect} className="p-1 hover:text-red-400 transition-colors text-gray-500">
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
