/**
 * lib/validation.ts
 * Input validation helpers used in API routes and frontend forms.
 */

import { isValidYouTubeUrl } from "./youtube";
import {
  MIN_ACCESS_DURATION_SECONDS,
  MAX_ACCESS_DURATION_SECONDS,
} from "./constants";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEthAddress(address: string): ValidationResult {
  if (!address) return { valid: false, error: "Address is required" };
  if (!/^0x[0-9a-fA-F]{40}$/.test(address))
    return { valid: false, error: "Invalid Ethereum address" };
  return { valid: true };
}

export function validateYouTubeUrl(url: string): ValidationResult {
  if (!url) return { valid: false, error: "YouTube URL is required" };
  if (!isValidYouTubeUrl(url))
    return { valid: false, error: "Invalid YouTube URL. Use a watch, youtu.be, or embed URL." };
  return { valid: true };
}

export function validatePrice(priceEth: string): ValidationResult {
  const n = parseFloat(priceEth);
  if (isNaN(n) || n <= 0)
    return { valid: false, error: "Price must be a positive number" };
  if (n > 10)
    return { valid: false, error: "Price cannot exceed 10 ETH" };
  return { valid: true };
}

export function validateDuration(seconds: number): ValidationResult {
  if (!Number.isInteger(seconds))
    return { valid: false, error: "Duration must be a whole number of seconds" };
  if (seconds < MIN_ACCESS_DURATION_SECONDS)
    return { valid: false, error: `Duration must be at least ${MIN_ACCESS_DURATION_SECONDS / 3600} hour(s)` };
  if (seconds > MAX_ACCESS_DURATION_SECONDS)
    return { valid: false, error: `Duration cannot exceed ${MAX_ACCESS_DURATION_SECONDS / 86400} days` };
  return { valid: true };
}

export function validateCampaignTitle(title: string): ValidationResult {
  if (!title?.trim()) return { valid: false, error: "Title is required" };
  if (title.trim().length < 3) return { valid: false, error: "Title must be at least 3 characters" };
  if (title.trim().length > 100) return { valid: false, error: "Title cannot exceed 100 characters" };
  return { valid: true };
}

export function validateDescription(desc: string): ValidationResult {
  if (!desc?.trim()) return { valid: false, error: "Description is required" };
  if (desc.trim().length < 10) return { valid: false, error: "Description must be at least 10 characters" };
  if (desc.trim().length > 1000) return { valid: false, error: "Description cannot exceed 1000 characters" };
  return { valid: true };
}

export function validateTxHash(hash: string): ValidationResult {
  if (!hash) return { valid: false, error: "Transaction hash is required" };
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash))
    return { valid: false, error: "Invalid transaction hash format" };
  return { valid: true };
}
