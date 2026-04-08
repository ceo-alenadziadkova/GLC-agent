/**
 * Canonical intake plan fixtures — Phase 0 regression (ADR unified bank).
 * Each fixture exercises product/collection modes and branch predicates; see intake-plan-snapshot.test.ts for coverage checks.
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../../types/audit.js';

export interface IntakePlanFixture {
  id: string;
  description: string;
  responses: Record<string, unknown>;
  productMode: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
}

export const INTAKE_PLAN_FIXTURES: IntakePlanFixture[] = [
  {
    id: 'hotel_website_full',
    description: 'Hospitality, public website, small team, CRM in stack — full SLA, has_crm + not_solo + is_hospitality + has_website',
    productMode: 'full',
    responses: {
      a2: 'hospitality',
      a4: '6–10 people',
      a5: 'Yes — we have a multi-page website',
      d1: ['Spreadsheets', 'CRM / sales pipeline'],
      revenue_model: 'mixed',
    },
  },
  {
    id: 'hotel_nosite_discovery',
    description: 'Hospitality, no public site — discovery collection',
    productMode: 'full',
    collectionMode: 'discovery',
    responses: {
      a2: 'hospitality',
      a5: 'no_website',
      revenue_model: 'b2c',
    },
  },
  {
    id: 'solo_website_express',
    description: 'Solo operator, website, no CRM — express SLA + no_crm + has_website',
    productMode: 'express',
    responses: {
      a2: 'retail',
      a4: 'Just me',
      a5: 'Yes — we have a multi-page website',
      d1: ['Email', 'Paper notebook'],
      revenue_model: 'b2c',
    },
  },
  {
    id: 'solo_nosite_discovery',
    description: 'Solo, no site — discovery',
    productMode: 'express',
    collectionMode: 'discovery',
    responses: {
      a2: 'saas / software',
      a4: 'Just me',
      a5: 'no_website',
      revenue_model: 'b2b',
    },
  },
  {
    id: 'realestate_website_full',
    description: 'Real estate with site — is_real_estate + has_website',
    productMode: 'full',
    responses: {
      a2: 'real estate',
      a4: '2–5 people',
      a5: 'Yes — we have a multi-page website',
      revenue_model: 'b2c',
    },
  },
  {
    id: 'restaurant_nosite_full',
    description: 'F&B, no site, social in c_nosite_1 — is_restaurant + no_website + nosite_social',
    productMode: 'full',
    responses: {
      a2: 'food & beverage',
      a5: 'no_website',
      c_nosite_1: ['Social media', 'Marketplaces, directories, or other online platforms'],
      revenue_model: 'b2c',
    },
  },
  {
    id: 'services_spain_pre_brief',
    description: 'Professional services, Spain location — is_services + spain_based; pre_brief collection',
    productMode: 'full',
    collectionMode: 'pre_brief',
    responses: {
      a2: 'professional services',
      a3: 'Barcelona, España',
      a5: 'no_website',
      revenue_model: 'b2b',
    },
  },
  {
    id: 'healthcare_express',
    description: 'Healthcare with website — is_healthcare + express',
    productMode: 'express',
    responses: {
      a2: 'healthcare',
      a4: 'Just me',
      a5: 'Yes — we have a multi-page website',
      d1: ['Basic calendar'],
      revenue_model: 'b2c',
    },
  },
  {
    id: 'marine_full',
    description: 'Marine, no site — is_marine + no_website',
    productMode: 'full',
    responses: {
      a2: 'marine',
      a5: 'no_website',
      revenue_model: 'b2c',
    },
  },
  {
    id: 'generic_nosite_discovery',
    description: 'Generic industry, no site — discovery',
    productMode: 'full',
    collectionMode: 'discovery',
    responses: {
      a2: 'education',
      a5: 'no_website',
      revenue_model: 'nonprofit',
    },
  },
];
