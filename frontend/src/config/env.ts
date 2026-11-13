/**
 * Application Environment Configuration
 * Handles seamless switching between Localhost and Production (oneassist.net.in)
 */

// 1. Detection of Host / Environment
const isBrowser = typeof window !== 'undefined';
const currentHostname = isBrowser ? window.location.hostname : '';
const currentProtocol = isBrowser ? window.location.protocol : 'https:';

// Check if running on localhost or private network
export const IS_LOCAL: boolean =
  !isBrowser ||
  currentHostname === 'localhost' ||
  currentHostname === '127.0.0.1' ||
  currentHostname === '0.0.0.0' ||
  currentHostname.startsWith('192.168.') ||
  currentHostname.startsWith('10.');

// Check if running on live production domain
export const IS_PROD: boolean =
  !IS_LOCAL ||
  (isBrowser && currentHostname.includes('oneassist.net.in')) ||
  import.meta.env.MODE === 'production';

// 2. Domain & Path Definitions
export const DOMAIN = {
  LIVE: 'oneassist.net.in',
  LOCAL: 'localhost:5000',
};

export const PATHS = {
  // Frontend Base Path (Common prefix for all IT CRM modules)
  FRONTEND_BASE: '/it-crm',
  
  // Backend API Base Path on live server
  BACKEND_BASE: IS_LOCAL ? 'http://localhost:5000/api' : 'https://oneassist.net.in/itcrmapi/api',
  
  // Backend Root Base (for uploads / static assets)
  BACKEND_ROOT: IS_LOCAL ? 'http://localhost:5000' : 'https://oneassist.net.in/itcrmapi',
};

// 3. Primary Exported Constants
// Allows explicit override via .env VITE_API_URL if needed, otherwise auto-resolves
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string) ||
  PATHS.BACKEND_BASE;

export const BASE_PATH: string =
  (import.meta.env.VITE_BASE_PATH as string) ||
  PATHS.FRONTEND_BASE;

export const BACKEND_ROOT_URL: string =
  (import.meta.env.VITE_BACKEND_ROOT as string) ||
  PATHS.BACKEND_ROOT;

// 4. Utility Helper Functions
/**
 * Build a full API URL given an endpoint (e.g. '/contacts' -> 'https://oneassist.net.in/itcrmapi/api/contacts')
 */
export function getApiUrl(endpoint: string = ''): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  return `${cleanBase}${cleanEndpoint}`;
}

/**
 * Build a frontend navigation route path with base path included (e.g. '/contacts' -> '/it-crm/contact')
 */
export function getAppPath(path: string = ''): string {
  const cleanPath = path.replace(/^\/+/, '');
  const cleanBase = BASE_PATH.replace(/\/+$/, '');

  // If path already starts with cleanBase, avoid duplicate prefixes like /it-crm/it-crm/...
  if (cleanBase && (cleanPath === cleanBase.replace(/^\/+/, '') || cleanPath.startsWith(`${cleanBase.replace(/^\/+/, '')}/`))) {
    return `/${cleanPath}`;
  }

  if (!cleanBase) return path.startsWith('/') ? path : `/${path}`;
  return cleanPath ? `${cleanBase}/${cleanPath}` : cleanBase || '/';
}

/**
 * Strip base path from pathname (e.g. '/it-crm/contact' -> 'contact')
 */
export function stripAppBasePath(fullPathname: string): string {
  if (!fullPathname) return '';
  let clean = fullPathname.split('?')[0].replace(/\/+$/, '');
  const cleanBase = BASE_PATH.replace(/\/+$/, '');

  if (cleanBase && clean.startsWith(cleanBase)) {
    clean = clean.slice(cleanBase.length);
  } else if (clean.startsWith('/it-crm')) {
    clean = clean.slice('/it-crm'.length);
  }
  return clean.replace(/^\/+/, '');
}

/**
 * Get absolute URL for static uploads (e.g. '/uploads/image.png')
 */
export function getUploadUrl(relativePath: string = ''): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${BACKEND_ROOT_URL}${cleanPath}`;
}

export const ENV = {
  IS_LOCAL,
  IS_PROD,
  API_BASE_URL,
  BASE_PATH,
  BACKEND_ROOT_URL,
  DOMAIN,
  PATHS,
  getApiUrl,
  getAppPath,
  stripAppBasePath,
  getUploadUrl,
};

export default ENV;

