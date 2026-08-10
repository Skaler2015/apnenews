// Canonical constants shared across the platform.
// Statuses are stored as strings in the DB for SQLite/Postgres portability.

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  EDITOR: 'EDITOR',
  REVIEWER: 'REVIEWER',
  AUTHOR: 'AUTHOR',
  SEO_MANAGER: 'SEO_MANAGER',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

// Coarse-grained permissions; roles map to a default set.
export const PERMISSIONS = {
  MANAGE_USERS: 'manage_users',
  MANAGE_SETTINGS: 'manage_settings',
  MANAGE_SOURCES: 'manage_sources',
  MANAGE_CATEGORIES: 'manage_categories',
  REVIEW_ARTICLES: 'review_articles',
  PUBLISH_ARTICLES: 'publish_articles',
  EDIT_ARTICLES: 'edit_articles',
  MANAGE_SEO: 'manage_seo',
  VIEW_ANALYTICS: 'view_analytics',
  RUN_AUTOMATION: 'run_automation',
} as const;

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),
  EDITOR: [
    PERMISSIONS.MANAGE_SOURCES,
    PERMISSIONS.MANAGE_CATEGORIES,
    PERMISSIONS.REVIEW_ARTICLES,
    PERMISSIONS.PUBLISH_ARTICLES,
    PERMISSIONS.EDIT_ARTICLES,
    PERMISSIONS.MANAGE_SEO,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.RUN_AUTOMATION,
  ],
  REVIEWER: [PERMISSIONS.REVIEW_ARTICLES, PERMISSIONS.EDIT_ARTICLES, PERMISSIONS.VIEW_ANALYTICS],
  AUTHOR: [PERMISSIONS.EDIT_ARTICLES],
  SEO_MANAGER: [PERMISSIONS.MANAGE_SEO, PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.EDIT_ARTICLES],
};

// News item lifecycle
export const ITEM_STATUS = {
  IMPORTED: 'IMPORTED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  DUPLICATE: 'DUPLICATE',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
} as const;

// Article lifecycle (spec §45)
export const ARTICLE_STATUS = {
  IMPORTED: 'IMPORTED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ArticleStatus = (typeof ARTICLE_STATUS)[keyof typeof ARTICLE_STATUS];

export const SOURCE_TYPES = ['RSS', 'API', 'GOV', 'PRESS', 'YOUTUBE', 'MANUAL'] as const;

export const DUPLICATE_VERDICT = {
  DIFFERENT: 'DIFFERENT', // 0-30
  REVIEW: 'REVIEW', // 31-70
  DUPLICATE: 'DUPLICATE', // 71-100
} as const;

export const PUBLISH_MODE = {
  AUTO: 'AUTO',
  REVIEW: 'REVIEW',
  HYBRID: 'HYBRID',
} as const;

// The 25 main categories from the spec. `order` drives nav ordering.
export const DEFAULT_CATEGORIES: {
  name: string;
  nameEn: string;
  slug: string;
  isLocal?: boolean;
  color?: string;
}[] = [
  { name: 'ताज़ा खबरें', nameEn: 'Latest News', slug: 'latest', color: '#c8102e' },
  { name: 'ब्रेकिंग न्यूज़', nameEn: 'Breaking News', slug: 'breaking', color: '#e11d48' },
  { name: 'भारत', nameEn: 'India', slug: 'india', color: '#ea580c' },
  { name: 'राजस्थान', nameEn: 'Rajasthan', slug: 'rajasthan', isLocal: true, color: '#d97706' },
  { name: 'दुनिया', nameEn: 'World', slug: 'world', color: '#0891b2' },
  { name: 'राजनीति', nameEn: 'Politics', slug: 'politics', color: '#7c3aed' },
  { name: 'बिज़नेस', nameEn: 'Business', slug: 'business', color: '#0d9488' },
  { name: 'अर्थव्यवस्था', nameEn: 'Economy', slug: 'economy', color: '#059669' },
  { name: 'टेक्नोलॉजी', nameEn: 'Technology', slug: 'technology', color: '#2563eb' },
  { name: 'शिक्षा', nameEn: 'Education', slug: 'education', color: '#4f46e5' },
  { name: 'नौकरी', nameEn: 'Jobs', slug: 'jobs', color: '#9333ea' },
  { name: 'सरकारी योजनाएं', nameEn: 'Government Schemes', slug: 'government-schemes', color: '#16a34a' },
  { name: 'खेल', nameEn: 'Sports', slug: 'sports', color: '#ca8a04' },
  { name: 'मनोरंजन', nameEn: 'Entertainment', slug: 'entertainment', color: '#db2777' },
  { name: 'ऑटो', nameEn: 'Auto', slug: 'auto', color: '#475569' },
  { name: 'स्वास्थ्य', nameEn: 'Health', slug: 'health', color: '#dc2626' },
  { name: 'लाइफस्टाइल', nameEn: 'Lifestyle', slug: 'lifestyle', color: '#be185d' },
  { name: 'विज्ञान', nameEn: 'Science', slug: 'science', color: '#0284c7' },
  { name: 'मौसम', nameEn: 'Weather', slug: 'weather', color: '#0ea5e9' },
  { name: 'वायरल', nameEn: 'Viral', slug: 'viral', color: '#f59e0b' },
  { name: 'क्राइम', nameEn: 'Crime', slug: 'crime', color: '#991b1b' },
  { name: 'कृषि', nameEn: 'Agriculture', slug: 'agriculture', color: '#65a30d' },
  { name: 'धर्म', nameEn: 'Religion', slug: 'religion', color: '#c2410c' },
  { name: 'करियर', nameEn: 'Career', slug: 'career', color: '#7c3aed' },
  { name: 'स्थानीय खबरें', nameEn: 'Local News', slug: 'local', isLocal: true, color: '#334155' },
];

// Rajasthan districts (spec §30) — admin can add more dynamically.
export const DEFAULT_DISTRICTS = [
  { name: 'जयपुर', nameEn: 'Jaipur', slug: 'jaipur' },
  { name: 'सीकर', nameEn: 'Sikar', slug: 'sikar' },
  { name: 'झुंझुनू', nameEn: 'Jhunjhunu', slug: 'jhunjhunu' },
  { name: 'चूरू', nameEn: 'Churu', slug: 'churu' },
  { name: 'नागौर', nameEn: 'Nagaur', slug: 'nagaur' },
  { name: 'बीकानेर', nameEn: 'Bikaner', slug: 'bikaner' },
  { name: 'अजमेर', nameEn: 'Ajmer', slug: 'ajmer' },
  { name: 'अलवर', nameEn: 'Alwar', slug: 'alwar' },
  { name: 'जोधपुर', nameEn: 'Jodhpur', slug: 'jodhpur' },
  { name: 'उदयपुर', nameEn: 'Udaipur', slug: 'udaipur' },
];

// Keywords used by the priority engine to detect breaking / important news.
export const BREAKING_KEYWORDS = [
  'breaking', 'ब्रेकिंग', 'बड़ी खबर', 'तत्काल', 'alert', 'अलर्ट',
  'blast', 'धमाका', 'हादसा', 'accident', 'earthquake', 'भूकंप',
  'निधन', 'मौत', 'हमला', 'attack', 'चुनाव परिणाम',
];

export const OFFICIAL_KEYWORDS = [
  'सरकार', 'मंत्रालय', 'अधिसूचना', 'आधिकारिक', 'घोषणा',
  'government', 'ministry', 'official', 'notification', 'scheme', 'योजना',
];
