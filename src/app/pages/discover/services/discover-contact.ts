export type DiscoverContactFields = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactCompany: string;
};

export function hasAnyContactValue(fields: DiscoverContactFields): boolean {
  return Boolean(
    fields.contactName.trim() ||
      fields.contactEmail.trim() ||
      fields.contactPhone.trim() ||
      fields.contactCompany.trim(),
  );
}

export function toDiscoveryContactPayload(fields: DiscoverContactFields): {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_company?: string;
} {
  return {
    contact_name: fields.contactName.trim() || undefined,
    contact_email: fields.contactEmail.trim() || undefined,
    contact_phone: fields.contactPhone.trim() || undefined,
    contact_company: fields.contactCompany.trim() || undefined,
  };
}
