export interface DeleteRunResult {
  runId: string;

  deleted: boolean;

  deletedArtifactFiles: number;

  failedArtifactFiles: string[];
}