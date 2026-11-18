/**
 * GymVIP - License Verification Configuration
 * Embedded Public Key for cryptographic validation of RSA-2048 activation licenses.
 */

export const LICENSE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA7Nt6oxML6qw9Wi49WaIR
7q1UPjBQB4JbMf401ev+6Wm8rmt+OYEbd3Bu9MAO8nrhjhjBNy+Ld0XD8RG82hKb
XxkcAjnODQlKOuI91QwTKvWTmZCNB4OpLWXmUErN4LWLT1Mrr1CQFEdy+RpSe04M
uX8AM911pwNPKwBHrWYWCpHE8X3vh09cAlL2Hq8GIZxiglr21kuV91Gj4auMbMhs
YY06fF+jQk8lDiUOSsYc/dTF7vcUj7S+bALSBCDwt2SNgqPTJEdo2hOTWlUvWWYs
CDf6h5MkrtT8qLprYdfki1EgdnXbYZWJyz+mhOekCsCRgHqALCnuwC6tIUHxgflJ
dQIDAQAB
-----END PUBLIC KEY-----`;

export const LICENSE_CONFIG = {
  DEFAULT_GRACE_PERIOD_DAYS: 3,
  SUPPORT_WHATSAPP: '201012345678', // Replaced with user's phone or customizable
  SUPPORT_NAME: 'فريق دعم GymVIP',
  KEY_PREFIX: 'GVLIC-',
};
