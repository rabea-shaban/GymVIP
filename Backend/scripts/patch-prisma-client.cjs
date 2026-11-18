/**
 * GymVIP - Automatic Prisma Client Enum & Model Type Patcher for SQLite
 * Injects core system enums into default.js / default.d.ts / index.js / index.d.ts
 */

const fs = require('fs');
const path = require('path');

const prismaClientDir = path.resolve(__dirname, '..', 'node_modules', '@prisma', 'client');
const dotPrismaClientDir = path.resolve(__dirname, '..', 'node_modules', '.prisma', 'client');

const dtsEnums = `
// --- GymVIP SQLite Enums Injection ---
export const Role: {
  readonly OWNER: "OWNER";
  readonly MANAGER: "MANAGER";
  readonly RECEPTIONIST: "RECEPTIONIST";
  readonly TRAINER: "TRAINER";
};
export type Role = (typeof Role)[keyof typeof Role];

export const Gender: {
  readonly MALE: "MALE";
  readonly FEMALE: "FEMALE";
};
export type Gender = (typeof Gender)[keyof typeof Gender];

export const SubscriptionStatus: {
  readonly ACTIVE: "ACTIVE";
  readonly FROZEN: "FROZEN";
  readonly EXPIRED: "EXPIRED";
  readonly CANCELLED: "CANCELLED";
};
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const PaymentMethod: {
  readonly CASH: "CASH";
  readonly CARD: "CARD";
  readonly BANK_TRANSFER: "BANK_TRANSFER";
  readonly WALLET: "WALLET";
};
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const WalletProvider: {
  readonly VODAFONE_CASH: "VODAFONE_CASH";
  readonly ORANGE_CASH: "ORANGE_CASH";
  readonly ETISALAT_CASH: "ETISALAT_CASH";
  readonly WE: "WE";
  readonly INSTAPAY: "INSTAPAY";
  readonly OTHER: "OTHER";
};
export type WalletProvider = (typeof WalletProvider)[keyof typeof WalletProvider];

export const NotificationType: {
  readonly SUBSCRIPTION_EXPIRING: "SUBSCRIPTION_EXPIRING";
  readonly SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED";
  readonly SUBSCRIPTION_RENEWED: "SUBSCRIPTION_RENEWED";
  readonly SUBSCRIPTION_FROZEN: "SUBSCRIPTION_FROZEN";
  readonly PAYMENT_RECEIVED: "PAYMENT_RECEIVED";
};
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
`;

const jsEnums = `// --- GymVIP SQLite Enums Injection ---
const Role = { OWNER: 'OWNER', MANAGER: 'MANAGER', RECEPTIONIST: 'RECEPTIONIST', TRAINER: 'TRAINER' };
const Gender = { MALE: 'MALE', FEMALE: 'FEMALE' };
const SubscriptionStatus = { ACTIVE: 'ACTIVE', FROZEN: 'FROZEN', EXPIRED: 'EXPIRED', CANCELLED: 'CANCELLED' };
const PaymentMethod = { CASH: 'CASH', CARD: 'CARD', BANK_TRANSFER: 'BANK_TRANSFER', WALLET: 'WALLET' };
const WalletProvider = { VODAFONE_CASH: 'VODAFONE_CASH', ORANGE_CASH: 'ORANGE_CASH', ETISALAT_CASH: 'ETISALAT_CASH', WE: 'WE', INSTAPAY: 'INSTAPAY', OTHER: 'OTHER' };
const NotificationType = { SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING', SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED', SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED', SUBSCRIPTION_FROZEN: 'SUBSCRIPTION_FROZEN', PAYMENT_RECEIVED: 'PAYMENT_RECEIVED' };

module.exports = {
  ...require('.prisma/client/default'),
  Role,
  Gender,
  SubscriptionStatus,
  PaymentMethod,
  WalletProvider,
  NotificationType,
};

exports.Role = Role;
exports.Gender = Gender;
exports.SubscriptionStatus = SubscriptionStatus;
exports.PaymentMethod = PaymentMethod;
exports.WalletProvider = WalletProvider;
exports.NotificationType = NotificationType;
`;

function patchDts(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('GymVIP SQLite Enums Injection')) {
    content = dtsEnums + '\n' + content;
  }

  // Replace scalar types in model payloads
  content = content.replace(/(scalars:\s*\{\s*id:\s*string;[\s\S]*?role:\s*)string(;[\s\S]*?isActive:\s*boolean)/g, '$1Role$2');
  content = content.replace(/(UserGroupByOutputType[\s\S]*?role:\s*)string(;[\s\S]*?isActive:\s*boolean)/g, '$1Role$2');
  content = content.replace(/(scalars:\s*\{\s*id:\s*string;[\s\S]*?gender:\s*)string \| null(;[\s\S]*?dateOfBirth)/g, '$1Gender | null$2');
  content = content.replace(/(scalars:\s*\{\s*id:\s*string;[\s\S]*?status:\s*)string(;[\s\S]*?notes)/g, '$1SubscriptionStatus$2');
  content = content.replace(/(scalars:\s*\{\s*id:\s*string;[\s\S]*?method:\s*)string(;[\s\S]*?walletProvider:\s*)string \| null/g, '$1PaymentMethod$2WalletProvider | null');
  content = content.replace(/(scalars:\s*\{\s*id:\s*string;[\s\S]*?type:\s*)string(;[\s\S]*?title:\s*string)/g, '$1NotificationType$2');

  fs.writeFileSync(filePath, content, 'utf8');
}

function patchJs(filePath) {
  if (!fs.existsSync(filePath)) return;
  fs.writeFileSync(filePath, jsEnums, 'utf8');
}

try {
  patchDts(path.join(dotPrismaClientDir, 'index.d.ts'));
  patchDts(path.join(dotPrismaClientDir, 'default.d.ts'));
  patchDts(path.join(prismaClientDir, 'index.d.ts'));
  patchDts(path.join(prismaClientDir, 'default.d.ts'));

  patchJs(path.join(prismaClientDir, 'index.js'));
  patchJs(path.join(prismaClientDir, 'default.js'));

  console.log('[PrismaPatch] All files patched successfully.');
} catch (err) {
  console.error('[PrismaPatch] Error patching:', err);
}
