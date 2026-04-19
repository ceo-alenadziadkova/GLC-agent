export type AuthMode = 'signin' | 'signup' | 'forgot';

export type SignupLegalFieldState = {
  acceptTos: boolean;
  acceptPrivacy: boolean;
};

export type FieldErrors = {
  email: string | null;
  password: string | null;
  recoveryPassword: string | null;
  recoveryConfirm: string | null;
};

export const EMPTY_FIELD_ERRORS: FieldErrors = {
  email: null,
  password: null,
  recoveryPassword: null,
  recoveryConfirm: null,
};
