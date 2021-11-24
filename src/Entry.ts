import type { Graph } from "./Graph";
import { SEPERATOR } from "./types";

export interface IEntryJSON {
  state: number;
}

export class Entry {
  graph: Graph;
  parent: Entry | null;
  key: string;
  state: number;

  constructor(graph: Graph, parent: Entry | null, key: string, state: number) {
    this.graph = graph;
    this.parent = parent;
    this.key = key;
    this.state = state;
  }

  getValue() {
    return this.graph.getValueAtPath(this.getPath());
  }
  getPath(): string {
    return this.parent
      ? this.parent.getPath() + SEPERATOR + this.key
      : this.key;
  }

  toJSON(): IEntryJSON {
    return {
      state: this.state,
    };
  }
}
