/**
 * GymVIP - Database Runner for yarn dev
 * Automatically detects or starts MySQL/MariaDB from XAMPP.
 */

import net from 'net';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = 3306;
const HOST = '127.0.0.1';
const MAX_WAIT_MS = 15000;
const RETRY_INTERVAL_MS = 400;

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

async function run() {
  // Check if MySQL is already running (e.g. from XAMPP Control Panel)
  const alreadyRunning = await isPortOpen(PORT, HOST);
  if (alreadyRunning) {
    console.log(`\x1b[32m[DATABASE] ✅ خدمة قاعدة البيانات (MySQL) تعمل بالفعل على بورت ${PORT}.\x1b[0m`);
    // Keep alive to stay in concurrently
    setInterval(() => {}, 1000 * 60 * 60);
    return;
  }

  console.log(`\x1b[33m[DATABASE] ⏳ خدمة قاعدة البيانات غير متصلة، جاري تشغيل MySQL تلقائياً من XAMPP...\x1b[0m`);

  const mysqlInfo = findMysqlExecutable();
  if (!mysqlInfo) {
    console.log(`\x1b[31m[DATABASE] ⚠️ خدمة قاعدة البيانات غير متاحة (MySQL). يرجى التأكد من تشغيل MySQL في XAMPP.\x1b[0m`);
    setInterval(() => {}, 1000 * 60 * 60);
    return;
  }

  const args = mysqlInfo.ini
    ? [`--defaults-file=${mysqlInfo.ini}`, '--standalone']
    : ['--standalone'];

  const mysqlProcess = spawn(mysqlInfo.exe, args, {
    stdio: 'ignore',
    windowsHide: true,
  });

  mysqlProcess.on('error', (err) => {
    console.log(`\x1b[31m[DATABASE] ⚠️ تعذر تشغيل MySQL: ${err.message}\x1b[0m`);
    console.log(`\x1b[31m[DATABASE] ⚠️ خدمة قاعدة البيانات غير متاحة (MySQL). يرجى التأكد من تشغيل MySQL في XAMPP.\x1b[0m`);
  });

  // Poll until port 3306 is open
  const start = Date.now();
  let connected = false;

  while (Date.now() - start < MAX_WAIT_MS) {
    await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
    if (await isPortOpen(PORT, HOST)) {
      connected = true;
      break;
    }
  }

  if (connected) {
    console.log(`\x1b[32m[DATABASE] 🚀 تم تشغيل خدمة قاعدة البيانات (MySQL) بنجاح وجاهزة للاتصال على بورت ${PORT}!\x1b[0m`);
  } else {
    console.log(`\x1b[31m[DATABASE] ⚠️ استغرق تشغيل MySQL وقتاً طويلاً. خدمة قاعدة البيانات غير متاحة (MySQL). يرجى التأكد من تشغيل MySQL في XAMPP.\x1b[0m`);
  }

  // Graceful exit handler
  const shutdown = () => {
    try {
      mysqlProcess.kill('SIGTERM');
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

run();
