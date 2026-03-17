/**
 * Smoke tests: zodToJsonSchema()
 *
 * Verifies that our custom Zod → JSON Schema converter correctly translates
 * all constraints used in DomainOutputSchema and StrategyOutputSchema.
 * This is critical because the constraints guide Claude's tool_use responses.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  zodToJsonSchema,
  DomainOutputSchema,
  StrategyOutputSchema,
  ReconOutputSchema,
} from '../schemas/domain-output.js';

// ─── Primitive constraints ─────────────────────────────────────────────────

describe('zodToJsonSchema — number constraints', () => {
  it('converts plain number to { type: "number" }', () => {
    const schema = z.number();
    expect(zodToJsonSchema(schema)).toEqual({ type: 'number' });
  });

  it('adds integer type for .int()', () => {
    const schema = z.number().int();
    expect(zodToJsonSchema(schema)).toMatchObject({ type: 'integer' });
  });

  it('adds minimum for .min()', () => {
    const schema = z.number().min(1);
    expect(zodToJsonSchema(schema)).toMatchObject({ minimum: 1 });
  });

  it('adds maximum for .max()', () => {
    const schema = z.number().max(5);
    expect(zodToJsonSchema(schema)).toMatchObject({ maximum: 5 });
  });

  it('combines int + min + max', () => {
    const schema = z.number().int().min(1).max(5);
    const result = zodToJsonSchema(schema);
    expect(result).toMatchObject({ type: 'integer', minimum: 1, maximum: 5 });
  });
});

describe('zodToJsonSchema — string constraints', () => {
  it('converts plain string to { type: "string" }', () => {
    expect(zodToJsonSchema(z.string())).toEqual({ type: 'string' });
  });

  it('adds minLength for .min()', () => {
    expect(zodToJsonSchema(z.string().min(50))).toMatchObject({ minLength: 50 });
  });

  it('adds maxLength for .max()', () => {
    expect(zodToJsonSchema(z.string().max(2000))).toMatchObject({ maxLength: 2000 });
  });

  it('combines minLength + maxLength', () => {
    const result = zodToJsonSchema(z.string().min(50).max(2000));
    expect(result).toMatchObject({ minLength: 50, maxLength: 2000 });
  });
});

describe('zodToJsonSchema — array constraints', () => {
  it('converts array to { type: "array", items: ... }', () => {
    const result = zodToJsonSchema(z.array(z.string()));
    expect(result).toMatchObject({ type: 'array', items: { type: 'string' } });
  });

  it('adds minItems for .min()', () => {
    const result = zodToJsonSchema(z.array(z.string()).min(1));
    expect(result).toMatchObject({ minItems: 1 });
  });

  it('adds maxItems for .max()', () => {
    const result = zodToJsonSchema(z.array(z.string()).max(8));
    expect(result).toMatchObject({ maxItems: 8 });
  });

  it('combines minItems + maxItems', () => {
    const result = zodToJsonSchema(z.array(z.number()).min(2).max(6));
    expect(result).toMatchObject({ minItems: 2, maxItems: 6 });
  });
});

describe('zodToJsonSchema — enum', () => {
  it('produces string with enum values', () => {
    const result = zodToJsonSchema(z.enum(['critical', 'high', 'medium', 'low']));
    expect(result).toMatchObject({
      type: 'string',
      enum: ['critical', 'high', 'medium', 'low'],
    });
  });
});

describe('zodToJsonSchema — nullable & optional wrappers', () => {
  it('nullable adds nullable: true to inner schema', () => {
    const result = zodToJsonSchema(z.string().nullable());
    expect(result).toMatchObject({ type: 'string', nullable: true });
  });

  it('optional unwraps to inner schema', () => {
    const result = zodToJsonSchema(z.string().optional());
    expect(result).toMatchObject({ type: 'string' });
  });

  it('optional fields are excluded from required list', () => {
    const schema = z.object({
      required_field: z.string(),
      optional_field: z.string().optional(),
    });
    const result = zodToJsonSchema(schema) as { required: string[] };
    expect(result.required).toContain('required_field');
    expect(result.required).not.toContain('optional_field');
  });
});

// ─── Full schema shapes ────────────────────────────────────────────────────

describe('DomainOutputSchema JSON Schema', () => {
  it('produces a valid object schema with all required fields', () => {
    const schema = zodToJsonSchema(DomainOutputSchema) as {
      type: string;
      required: string[];
      properties: Record<string, unknown>;
    };

    expect(schema.type).toBe('object');
    expect(schema.required).toEqual(
      expect.arrayContaining(['score', 'label', 'summary', 'strengths', 'weaknesses', 'issues', 'quick_wins', 'recommendations'])
    );
  });

  it('score has integer type with min 1 and max 5', () => {
    const schema = zodToJsonSchema(DomainOutputSchema) as {
      properties: Record<string, { type: string; minimum: number; maximum: number }>;
    };
    expect(schema.properties.score).toMatchObject({ type: 'integer', minimum: 1, maximum: 5 });
  });

  it('summary has minLength 50 and maxLength 2000', () => {
    const schema = zodToJsonSchema(DomainOutputSchema) as {
      properties: Record<string, { minLength: number; maxLength: number }>;
    };
    expect(schema.properties.summary).toMatchObject({ minLength: 50, maxLength: 2000 });
  });

  it('strengths array has minItems 1 and maxItems 8', () => {
    const schema = zodToJsonSchema(DomainOutputSchema) as {
      properties: Record<string, { minItems: number; maxItems: number }>;
    };
    expect(schema.properties.strengths).toMatchObject({ minItems: 1, maxItems: 8 });
  });

  it('issues array has minItems 1 and maxItems 10', () => {
    const schema = zodToJsonSchema(DomainOutputSchema) as {
      properties: Record<string, { minItems: number; maxItems: number }>;
    };
    expect(schema.properties.issues).toMatchObject({ minItems: 1, maxItems: 10 });
  });
});

describe('StrategyOutputSchema JSON Schema', () => {
  it('quick_wins requires minItems 2 and maxItems 6', () => {
    const schema = zodToJsonSchema(StrategyOutputSchema) as {
      properties: Record<string, { minItems: number; maxItems: number }>;
    };
    expect(schema.properties.quick_wins).toMatchObject({ minItems: 2, maxItems: 6 });
  });

  it('executive_summary has minLength 100 and maxLength 3000', () => {
    const schema = zodToJsonSchema(StrategyOutputSchema) as {
      properties: Record<string, { minLength: number; maxLength: number }>;
    };
    expect(schema.properties.executive_summary).toMatchObject({ minLength: 100, maxLength: 3000 });
  });

  it('strategic array has minItems 1 and maxItems 4', () => {
    const schema = zodToJsonSchema(StrategyOutputSchema) as {
      properties: Record<string, { minItems: number; maxItems: number }>;
    };
    expect(schema.properties.strategic).toMatchObject({ minItems: 1, maxItems: 4 });
  });
});

describe('ReconOutputSchema JSON Schema', () => {
  it('produces an object schema', () => {
    const schema = zodToJsonSchema(ReconOutputSchema) as { type: string };
    expect(schema.type).toBe('object');
  });

  it('nullable fields are NOT in required list', () => {
    const schema = zodToJsonSchema(ReconOutputSchema) as { required: string[] };
    // company_name, industry etc. are z.string().nullable() — should not be required
    expect(schema.required).not.toContain('company_name');
    expect(schema.required).not.toContain('industry');
  });

  it('array fields (key_services_products) appear in required', () => {
    const schema = zodToJsonSchema(ReconOutputSchema) as { required: string[] };
    expect(schema.required).toContain('key_services_products');
  });
});
