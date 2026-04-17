import type { PhaseStatus } from './phase-status.js';

export interface ReconData {
  id: string;
  audit_id: string;
  status: PhaseStatus;
  company_name: string | null;
  industry: string | null;
  location: string | null;
  languages: string[];
  tech_stack: TechStack;
  social_profiles: Record<string, string>;
  contact_info: ContactInfo;
  pages_crawled: CrawledPage[];
  brief: string | null;
  interview_answers: string | null;
}

export interface TechStack {
  cms: string[];
  analytics: string[];
  hosting_cdn: string[];
  frameworks: string[];
  chat_support: string[];
  ecommerce: string[];
  email_marketing: string[];
  booking: string[];
}

export interface ContactInfo {
  emails: string[];
  phones: string[];
  addresses: string[];
}

export interface CrawledPage {
  url: string;
  title: string;
  status: number;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  structured_data: string[];
  /** Field names match crawler.ts output exactly: total / with_alt / missing_alt / lazy_loaded */
  images: {
    total: number;
    with_alt: number;
    missing_alt: number;
    lazy_loaded: number;
  };
  links: { internal: string[]; external: string[] };
  content_length?: number;
  load_time_ms?: number;
}
