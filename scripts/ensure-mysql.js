/**
 * GymVIP - Automated MySQL Service Checker & Launcher
 * Ensures MySQL / MariaDB daemon is running before starting the application.
 */

import net from 'net';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 3306;
const HOST = '127.0.0.1';
const MAX_WAIT_MS = 12000;
const RETRY_INTERVAL_MS = 500;

function isPortOpen(port, host) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });
}

function findMysqlExecutable() {
  const possiblePaths = [
    'C:\\xampp\\mysql\\bin\\mysqld.exe',
    'D:\\xampp\\mysql\\bin\\mysqld.exe',
    'E:\\xampp\\mysql\\bin\\mysqld.exe',
    'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqld.exe',
    'C:\\Program Files\\MariaDB 10.4\\bin\\mysqld.exe',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const dir = path.dirname(p);
      const ini = path.join(dir, 'my.ini');
      return {
        exe: p,
        ini: fs.existsSync(ini) ? ini : null,
      };
    }
  }
  return null;
}

async function ensureMysql() {
  // 1. Check if MySQL is already running
  const alreadyRunning = await isPortOpen(PORT, HOST);
  if (alreadyRunning) {
    console.log(`\x1b[32m[DATABASE] ✅ خدمة قاعدة البيانات (MySQL) تعمل بالفعل على بورت ${PORT}.\x1b[0m`);
    return true;
  }

  console.log(`\x1b[33m[DATABASE] ⏳ خدمة قاعدة البيانات غير متصلة، جاري محاولة تشغيل MySQL تلقائياً من XAMPP...\x1b[0m`);

  // 2. Locate MySQL executable
  const mysqlInfo = findMysqlExecutable();
  if (!mysqlInfo) {
    console.log(`\x1b[31m[DATABASE] ⚠️ خدمة قاعدة البيانات غير متاحة (MySQL). يرجى التأكد من تشغيل MySQL في XAMPP يدوياً.\x1b[0m`);
    return false;
  }

  // 3. Start MySQL as detached background process
  try {
    const args = mysqlInfo.ini
      ? [`--defaults-file=${mysqlInfo.ini}`, '--standalone']
      : ['--standalone'];

    const child = spawn(mysqlInfo.exe, args, {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });

    child.unref();
  } catch (err) {
    console.log(`\x1b[31m[DATABASE] ⚠️ تعذر تشغيل MySQL تلقائياً: ${err.message}\x1b[0m`);
    console.log(`\x1b[31m[DATABASE] ⚠️ يرجى التأكد من تشغيل MySQL في XAMPP يدوياً.\x1b[0m`);
    return false;
  }

  // 4. Wait for MySQL to become ready
  const startTime = Date.now();
  while (Date.now() - startTime < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    const ready = await isPortOpen(PORT, HOST);
    if (ready) {
      console.log(`\x1b[32m[DATABASE] 🚀 تم تشغيل خدمة قاعدة البيانات (MySQL) بنجاح وهي جاهزة للاتصال على بورت ${PORT}!\x1b[0m\n`);
      return true;
    }
  }

  console.log(`\x1b[31m[DATABASE] ⚠️ خدمة قاعدة البيانات غير متاحة (MySQL). استغرق التشغيل وقتاً أطول من المتوقع، يرجى التأكد من تشغيل MySQL في XAMPP.\x1b[0m\n`);
  return false;
}

ensureMysql().then(() => {
  // Always exit with 0 so the dev server can proceed even if MySQL was already up or user started it
  process.exit(0);
});
