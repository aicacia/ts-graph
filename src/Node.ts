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
  children: { [key: string]: Edge | Node } = {};

  toJSON(): INodeJSON {
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
        {} as INodeJSON["children"]
      ),
    };
  }
}
