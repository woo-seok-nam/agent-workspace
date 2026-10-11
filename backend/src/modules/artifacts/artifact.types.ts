export interface Artifact {
  id: string;

  runId: string;

  name: string;

  type: string;

  path: string;

  mimeType: string;

  size: number;

  createdAt: string;
}

export interface CreateArtifactInput {
  runId: string;

  name: string;

  type: string;

  path: string;

  mimeType: string;

  size: number;
}