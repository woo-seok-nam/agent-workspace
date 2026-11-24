import { writeFile } from 'node:fs/promises';
import { responseJsonSchema } from '../src/generator/schema.js';
import { DEMO_REQUEST, sampleDraft } from '../src/generator/demo.js';
for (const [file, value] of [
  ['schemas/workflow-generator-response.schema.json', responseJsonSchema()],
  ['examples/generator/request.json', DEMO_REQUEST],
  ['examples/generator/expected-draft.json', sampleDraft()],
] as const) await writeFile(file, JSON.stringify(value, null, 2) + '\n');
