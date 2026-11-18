/**
 * GymVIP - Core System Enums
 * Decoupled from Prisma database provider to support both SQLite and MySQL seamlessly.
 */

export const Role = {
  OWNER: 'OWNER',
  MANAGER: 'MANAGER',
  RECEPTIONIST: 'RECEPTIONIST',
  TRAINER: 'TRAINER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  PENDING: 'PENDING',
  FROZEN: 'FROZEN',
  CANCELLED: 'CANCELLED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PaymentMethod = {
  CASH: 'CASH',
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  WALLET: 'WALLET',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const WalletProvider = {
  VODAFONE_CASH: 'VODAFONE_CASH',
  ORANGE_CASH: 'ORANGE_CASH',
  ETISALAT_CASH: 'ETISALAT_CASH',
  WE: 'WE',
  INSTAPAY: 'INSTAPAY',
  OTHER: 'OTHER',
} as const;
export type WalletProvider = (typeof WalletProvider)[keyof typeof WalletProvider];

export const NotificationType = {
  SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_FROZEN: 'SUBSCRIPTION_FROZEN',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const LicenseStatus = {
  ACTIVE: 'ACTIVE',
  GRACE_PERIOD: 'GRACE_PERIOD',
  EXPIRED: 'EXPIRED',
  NOT_ACTIVATED: 'NOT_ACTIVATED',
  TAMPERED: 'TAMPERED',
} as const;
export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus];

export const LicenseTier = {
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
} as const;
export type LicenseTier = (typeof LicenseTier)[keyof typeof LicenseTier];
