/*
 * Public API Surface of angular-foundation
 */

// ===================================
// 🏗️ ARCHITECTURAL PATTERNS
// ===================================
export * from './lib/patterns';

// ===================================
// 🎨 UI COMPONENTS  
// ===================================
export * from './lib/components';

// ===================================
// 📡 DATA SERVICES
// ===================================

// Core Data Services
export * from './lib/services/firestore';
export * from './lib/services/firestore-crud';

// HTTP & API Services
export * from './lib/services/http';

// Cache & Storage Services  
export * from './lib/services/cache';
export * from './lib/services/indexed-db';
export * from './lib/services/storage';

// ===================================
// 🔐 AUTHENTICATION & SECURITY
// ===================================
export * from './lib/services/auth';

// ===================================
// 🎯 PLATFORM SERVICES
// ===================================

// SSR & Platform Detection
export * from './lib/services/ssr';

// Device & Hardware
export * from './lib/services/camera';
export * from './lib/services/location';
export * from './lib/services/viewport';
export * from './lib/services/notification';

// ===================================
// 🎨 UI & UX SERVICES
// ===================================

// User Interface
export * from './lib/services/overlay';
export * from './lib/services/toast';
export * from './lib/services/theme-store';

// Data Presentation
export * from './lib/services/pagination';
export * from './lib/services/list-filter';

// ===================================
// 🤖 AI & TEXT PROCESSING
// ===================================
export * from './lib/services/llm';
export * from './lib/services/text-parser';
export * from './lib/services/rule-engine';

// ===================================
// 🔧 DEVELOPMENT & DEBUGGING
// ===================================
export * from './lib/services/error-logging';
export * from './lib/services/feature-flags';
export * from './lib/services/firebase-metrics';

// ===================================
// 🌐 EXTERNAL INTEGRATIONS
// ===================================
export * from './lib/services/telegram';
export * from './lib/services/cookie';

// ===================================
// 🛠️ UTILITIES
// ===================================
export * from './lib/utils/validators';
export * from './lib/utils/object-url-manager';
export * from './lib/utils/array-helpers';

// ===================================
// 🔄 PIPES
// ===================================
export * from './lib/pipes/relative-date';
export * from './lib/pipes/days-until';