import { Entry } from "./Entry";
import type { Edge, IEdgeJSON } from "./Edge";
import type { IEntryJSON } from "./Entry";
import type { IRefJSON } from "./Ref";

export interface INodeJSON extends IEntryJSON {
  children: {
    [key: string]: IEdgeJSON | IRefJSON;
  };
}

export class Node extends Entry {
  children: Map<string, Edge | Node> = new Map();

  toJSON(): INodeJSON {
    const children: INodeJSON["children"] = {};
    for (const [key, child] of this.children) {
      if (child instanceof Node) {
        children[key] = { state: child.state, id: child.getPath() };
      } else {
        children[key] = child.toJSON();
      }
    }
    return {
      ...super.toJSON(),
      children,
    };
  }
}
