import type { Graph } from "./Graph";
import type { IEntryJSON } from "./Entry";
import { IRefJSON, Ref } from "./Ref";
import { Entry } from "./Entry";
import type { IGraphValue, IValueOf } from "./types";

export interface IEdgeJSON<T extends IGraphValue = IGraphValue>
  extends IEntryJSON {
  value: IValueOf<T> | IRefJSON<T>;
}

export class Edge<T extends IGraphValue = IGraphValue> extends Entry {
  value: IValueOf<T> | Ref;

  constructor(
    graph: Graph,
    parent: Entry | null,
    key: string,
    state: number,
    value: IValueOf<T> | Ref
  ) {
    super(graph, parent, key, state);
    this.value = value;
  }

  getPath() {
    return this.value instanceof Ref ? this.value.getPath() : super.getPath();
  }

  toJSON(): IEdgeJSON<T> | IRefJSON<T> {
    return this.value instanceof Ref
      ? this.value.toJSON()
      : {
          ...super.toJSON(),
          value: this.value,
        };
  }
}
