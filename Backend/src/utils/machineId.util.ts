import { execSync } from 'child_process'
import crypto from 'crypto'
import os from 'os'
import fs from 'fs'
import path from 'path'

let cachedMachineId: string | null = null

/**
 * Gets a stable, unique Hardware ID for the machine (Windows UUID + Motherboard Serial)
 * Formatted as: GV-XXXX-XXXX-XXXX-XXXX
 */
export const getMachineId = (): string => {
  if (cachedMachineId) return cachedMachineId

  const cacheFilePath = path.resolve(process.cwd(), '.machine_id')
  let rawHardwareData = ''

  // 1. Try Windows CIM/WMI
  if (process.platform === 'win32') {
    try {
      const output = execSync(
        'powershell -NoProfile -ExecutionPolicy Bypass -Command "Write-Output ((Get-CimInstance Win32_ComputerSystemProduct).UUID); Write-Output ((Get-CimInstance Win32_BaseBoard).SerialNumber)"',
        { timeout: 3500, stdio: ['ignore', 'pipe', 'ignore'] }
      )
        .toString()
        .trim()
      if (output.length > 5) {
        rawHardwareData = output.replace(/[\r\n\s]+/g, ':')
      }
    } catch {
      // Fallback
    }
  } else if (process.platform === 'linux') {
    try {
      if (fs.existsSync('/etc/machine-id')) {
        rawHardwareData = fs.readFileSync('/etc/machine-id', 'utf8').trim()
      } else if (fs.existsSync('/var/lib/dbus/machine-id')) {
        rawHardwareData = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim()
      }
    } catch {}
  } else if (process.platform === 'darwin') {
    try {
      const output = execSync(
        "ioreg -rd1 -c IOPlatformExpertDevice | awk '/IOPlatformUUID/ { print $3 }'",
        { timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }
      )
        .toString()
        .trim()
      rawHardwareData = output.replace(/[^a-zA-Z0-9-]/g, '')
    } catch {}
  }

  // Fallback if hardware query fails
  if (!rawHardwareData) {
    if (fs.existsSync(cacheFilePath)) {
      try {
        const stored = fs.readFileSync(cacheFilePath, 'utf8').trim()
        if (stored.startsWith('GV-')) {
          cachedMachineId = stored
          return stored
        }
      } catch {}
    }

    const networkInterfaces = os.networkInterfaces()
    let macAddress = ''
    for (const key of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[key]
      if (iface) {
        for (const detail of iface) {
          if (!detail.internal && detail.mac && detail.mac !== '00:00:00:00:00:00') {
            macAddress = detail.mac
            break
          }
        }
      }
      if (macAddress) break
    }

    rawHardwareData = `FALLBACK:${os.hostname()}:${os.arch()}:${macAddress}`
  }

  // Create deterministic hash
  const hash = crypto
    .createHash('sha256')
    .update(`GYMVIP-HW-LOCK:${rawHardwareData}`)
    .digest('hex')
    .toUpperCase()

  const formattedId = `GV-${hash.slice(0, 4)}-${hash.slice(4, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}`
  cachedMachineId = formattedId

  try {
    if (!fs.existsSync(cacheFilePath)) {
      fs.writeFileSync(cacheFilePath, formattedId, 'utf8')
    }
  } catch {}

  return formattedId
}
