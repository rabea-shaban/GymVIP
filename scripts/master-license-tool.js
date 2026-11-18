/**
 * GymVIP - Master License Generator Tool (Private & Standalone)
 * Run this on your own machine to issue signed cryptographically secure license keys to gym clients.
 * Usage:
 *   node scripts/master-license-tool.js --gym "FitLife Gym" --machine "GV-4C4C-0052-5010-8057" --days 365 --members 500
 * Or run interactively:
 *   node scripts/master-license-tool.js
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const privateKeyPath = path.resolve('scripts', 'keys', 'private.pem');

if (!fs.existsSync(privateKeyPath)) {
  console.error('\n❌ Error: Private key not found at scripts/keys/private.pem');
  console.error('Run: node scripts/generate-keys.js first.\n');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
      options[key] = val;
    }
  }
  return options;
}

function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

export function generateLicense({
  gymName,
  machineId,
  tier = 'PRO',
  maxMembers = 500,
  days = 365,
  amountPaid = 0,
  gracePeriodDays = 3,
  features = ['ALL'],
}) {
  const issuedAt = new Date();
  const durationDays = Number(days);
  const expiresAt = new Date(issuedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const licenseId = crypto.randomUUID();

  const payload = {
    licenseId,
    gymName,
    machineId,
    tier,
    maxMembers: Number(maxMembers),
    amountPaid: Number(amountPaid),
    durationDays,
    features: Array.isArray(features) ? features : [features],
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    gracePeriodDays: Number(gracePeriodDays),
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');

  // Sign with RSA-SHA256 using Private Key
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(payloadBase64);
  const signatureBase64 = signer.sign(privateKey, 'base64');

  const fullLicenseKey = `GVLIC-${payloadBase64}.${signatureBase64}`;

  // Log to history file
  const historyPath = path.resolve('scripts', 'issued_licenses.json');
  let history = [];
  if (fs.existsSync(historyPath)) {
    try {
      history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
    } catch {}
  }
  history.push({
    issuedAt: issuedAt.toISOString(),
    gymName,
    machineId,
    tier,
    maxMembers,
    amountPaid: Number(amountPaid),
    durationDays,
    expiresAt: expiresAt.toISOString(),
    key: fullLicenseKey,
  });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');

  return {
    key: fullLicenseKey,
    payload,
    expiresAtFormatted: expiresAt.toLocaleDateString('ar-EG', { dateStyle: 'long' }),
  };
}

async function run() {
  console.log('\n=============================================================');
  console.log('   👑 GymVIP SaaS - Master License Key Generator');
  console.log('=============================================================\n');

  const cliOptions = parseArgs();

  let gymName = cliOptions.gym;
  let machineId = cliOptions.machine;
  let tier = cliOptions.tier || 'PRO';
  let members = cliOptions.members || 500;
  let days = cliOptions.days || 365;
  let amountPaid = cliOptions.amount || 0;

  if (!gymName) {
    gymName = await prompt('📌 اسم الجيم (Gym Name): ');
  }
  if (!machineId) {
    machineId = await prompt('💻 كود جهاز العميل (Machine ID, e.g. GV-XXXX-XXXX-XXXX): ');
  }
  if (!cliOptions.members) {
    const memAns = await prompt('👥 الحد الأقصى للأعضاء (افتراضي: 500): ');
    if (memAns) members = Number(memAns);
  }
  if (!cliOptions.days) {
    const daysAns = await prompt('⏳ مدة الترخيص بالأيام (افتراضي: 365 يوم - سنة): ');
    if (daysAns) days = Number(daysAns);
  }
  if (!cliOptions.amount) {
    const amtAns = await prompt('💰 المبلغ المدفوع بالجنيه المصري (افتراضي: 0): ');
    if (amtAns) amountPaid = Number(amtAns);
  }

  if (!gymName || !machineId) {
    console.error('❌ خطأ: اسم الجيم وكود الجهاز مطلوبان لإصدار الترخيص!');
    process.exit(1);
  }

  const result = generateLicense({
    gymName,
    machineId,
    tier,
    maxMembers: members,
    days,
    amountPaid,
  });

  console.log('\n✅ تم توليد كود التفعيل المشفر بنجاح!\n');
  console.log('-------------------------------------------------------------');
  console.log('🔑 كود التفعيل (License Key):');
  console.log(result.key);
  console.log('-------------------------------------------------------------');
  console.log(`📅 تاريخ الانتهاء: ${result.expiresAtFormatted} (${days} يوم)`);
  console.log(`👥 الحد الأقصى للأعضاء: ${members} عضو`);
  console.log(`💰 المبلغ المدفوع: ${amountPaid} ج.م`);
  console.log(`🏢 الجيم: ${gymName}`);
  console.log(`💻 كود الجهاز: ${machineId}`);
  console.log('-------------------------------------------------------------\n');

  console.log('📱 رسالة واتساب جاهزة للإرسال للعميل:');
  console.log('-------------------------------------------------------------');
  console.log(`مرحباً إدارة ${gymName} 🌸
يسعدنا إرسال كود تفعيل نسختكم الخاصة من برنامج إدارة الأندية الرياضية GymVIP:

🔹 باقة الاشتراك: ${tier} (${members} عضو)
🔹 الصلاحية: ${days} يوم حتى ${result.expiresAtFormatted}
🔹 المبلغ المدفوع: ${amountPaid} ج.م
🔹 كود التفعيل:
\`\`\`
${result.key}
\`\`\`

طريقة التفعيل:
انسخ الكود بالكامل وقم بلصقه في خانة التفعيل داخل البرنامج واضغط "تفعيل النظام".
شكراً لثقتكم بنا! 🤝`);
  console.log('-------------------------------------------------------------\n');
}

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('master-license-tool.js')) {
  run().catch(console.error);
}
