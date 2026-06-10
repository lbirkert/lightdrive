import { setContext, getContext, hasContext } from "svelte";
import type { Readable } from "svelte/store";

const FORM_KEY = Symbol("form");

export type FormErrors = Record<string, string | undefined>;
export type FormValues = Record<string, Readable<unknown>>;

export type FieldRegistration = {
  id: string;
  value: Readable<unknown>;
};

export type FormCtx = {
  register: (field: FieldRegistration) => void;
  unregister: (id: string) => void;
  setError: (id: string, error: string | undefined) => void;
  errors: FormErrors;
  hasErrors: boolean;
  values: FormValues;
  submitted: boolean;
  validateAll: () => boolean;
};

export const key: any = {};

export const getFormCtx = () => hasContext(key) ? getContext<FormCtx>(key) : null;
export const setFormCtx = (val: FormCtx) => setContext<FormCtx>(key, val);
