import type { Graph } from "./Graph";
import type { IEntryJSON } from "./Entry";
import { IRefJSON, Ref } from "./Ref";
import { Entry } from "./Entry";
import type { IPrimitive } from "./types";

export interface IEdgeJSON extends IEntryJSON {
  value: IPrimitive;
}

export class Edge extends Entry {
  value: IPrimitive | Ref;

  constructor(
    graph: Graph,
    parent: Entry | null,
    key: string,
    state: number,
    value: IPrimitive
  ) {
    super(graph, parent, key, state);
    this.value = value;
  }

  getPath() {
    return this.value instanceof Ref ? this.value.getPath() : super.getPath();
  }

  toJSON(): IEdgeJSON | IRefJSON {
    return this.value instanceof Ref
      ? this.value.toJSON()
      : {
          ...super.toJSON(),
          value: this.value,
        };
  }
}
