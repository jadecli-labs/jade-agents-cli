/**
 * Cube.js semantic layer client.
 *
 * Fail-fast: connection errors throw immediately.
 */

export interface CubeConfig {
  readonly apiUrl: string;
  readonly apiKey: string;
  readonly useFake?: boolean;
}

export class CubeClient {
  public readonly apiUrl: string;
  private readonly useFake: boolean;

  constructor(config: CubeConfig) {
    if (!config.apiUrl || !config.apiUrl.trim()) {
      throw new Error("apiUrl must be a non-empty string");
    }
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new Error("apiKey must be a non-empty string");
    }
    this.apiUrl = config.apiUrl;
    this.useFake = config.useFake ?? false;
  }

  query(query: Record<string, any>): { data: Record<string, any>[] } {
    if (!query.measures && !query.dimensions) {
      throw new Error("Query must have at least 'measures' or 'dimensions'");
    }

    if (this.useFake) {
      return this.fakeQuery(query);
    }

    throw new Error(
      "Real Cube.js API not implemented. Use useFake: true for testing."
    );
  }

  private fakeQuery(
    query: Record<string, any>
  ): { data: Record<string, any>[] } {
    const measures: string[] = query.measures ?? [];
    const dimensions: string[] = query.dimensions ?? [];

    const row: Record<string, any> = {};
    for (const m of measures) {
      row[m] = 42;
    }
    for (const d of dimensions) {
      row[d] = "sample_value";
    }

    return { data: [row] };
  }
}
