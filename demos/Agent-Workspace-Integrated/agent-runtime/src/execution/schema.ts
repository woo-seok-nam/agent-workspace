/** API wire schema: all declared keys are required, including optional output ports.
 * Optional ports may return an empty string. Local semantic checks remain authoritative. */
export function stepResponseSchema(ports: { name: string; required: boolean }[], review: boolean): Record<string, unknown> {
  return {
    type: 'object', additionalProperties: false,
    properties: {
      outputs: { type: 'object', additionalProperties: false,
        properties: Object.fromEntries(ports.map(p => [p.name, { type: 'string', ...(p.required ? { minLength: 1 } : {}), maxLength: 20000 }])),
        required: ports.map(p => p.name) },
      verdict: review ? { type: 'string', enum: ['pass', 'needs_revision'] } : { type: 'null' },
      issues: { type: 'array', items: { type: 'string', minLength: 1 }, maxItems: 30 },
    },
    required: ['outputs', 'verdict', 'issues'],
  };
}
