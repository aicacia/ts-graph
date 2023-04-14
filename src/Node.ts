import { Entry } from "./Entry";
import type { Edge, IEdgeJSON } from "./Edge";
import type { IEntryJSON } from "./Entry";
import type { IRefJSON } from "./Ref";
import { IGraph, IKeyOf } from "./types";

export interface INodeJSON<T extends IGraph = IGraph> extends IEntryJSON {
  children: {
    [K in IKeyOf<T>]: IEdgeJSON<T[K]> | IRefJSON<T[K]>;
  };
}

export class Node<T extends IGraph = IGraph> extends Entry {
  children: { [key: string]: Edge<T> | Node<T> } = {};

  toJSON(): INodeJSON<T> {
    return {
      ...super.toJSON(),
      children: Object.entries(this.children).reduce(
        (children, [key, child]) => {
          if (child instanceof Node) {
            children[key] = { state: child.state, id: child.getPath() };
          } else {
            children[key] = child.toJSON();
          }
          return children;
        },
        {} as { [key: string]: IEdgeJSON | IRefJSON }
      ) as INodeJSON<T>["children"],
    };
  }
}
