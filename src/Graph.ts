import { EventEmitter } from "eventemitter3";
import type { IEdgeJSON } from "./Edge";
import { Edge } from "./Edge";
import type { IEntryJSON } from "./Entry";
import type { INodeJSON } from "./Node";
import { Node } from "./Node";
import type { IRefJSON } from "./Ref";
import { Ref } from "./Ref";
import type {
  IGraph,
  IGraphValue,
  IKeyOf,
  IRefValue,
  IPrimitive,
} from "./types";
import { SEPERATOR } from "./types";

export interface IDeleteJSON extends IEntryJSON {
  delete: true;
}

export interface IGraphEvents<T extends IGraph> {
  get(this: Graph<T>, path: string): void;
  set(
    this: Graph<T>,
    path: string,
    value: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON
  ): void;
  change(
    this: Graph<T>,
    path: string,
    value: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON
  ): void;
}

export interface IGraphJSON extends IEntryJSON {
  entries: {
    [key: string]: IEdgeJSON | INodeJSON | IPrimitive;
  };
}

export class Graph<T extends IGraph = IGraph> extends EventEmitter<
  IGraphEvents<T>
> {
  protected state = Date.now();
  protected entries: { [key: string]: Node | Edge } = {};
  protected listeningPaths: Set<string> = new Set();
  protected waitMS = 5000;
  protected shouldOverwriteFn: IShouldOverwriteFn = defaultShouldOverwriteFn;

  setShouldOverwriteFn(shouldOverwriteFn: IShouldOverwriteFn) {
    this.shouldOverwriteFn = shouldOverwriteFn;
    return this;
  }
  getShouldOverwriteFn() {
    return this.shouldOverwriteFn;
  }

  setWaitMS(waitMS: number) {
    this.waitMS = waitMS;
    return this;
  }
  getWaitMS() {
    return this.waitMS;
  }

  getEntries() {
    return this.entries;
  }

  getState() {
    return this.state;
  }

  get<K extends IKeyOf<T> = IKeyOf<T>>(key: K): Ref<T[K]> {
    return new Ref(this, key, this.state);
  }

  getValueAtPath<V extends IGraphValue = IGraphValue>(
    path: string
  ): IRefValue<V> | undefined {
    const node = this.getNodeAtPath(path);
    let value: IRefValue<V> | undefined;

    if (node) {
      value = getValueAtNode<V>(this, node);
      if (value === undefined) {
        this.listenAtPath(path);
      }
    } else {
      this.listenAtPath(path);
    }

    return value;
  }

  getNodeAtPath(path: string): Node | Edge | undefined {
    return getNodeAtPath(this, path, {});
  }

  set(path: string, value: IGraphValue) {
    this.state = Date.now();
    this.setPathInternal(path, value, this.state);
    return this;
  }

  delete(path: string) {
    this.state = Date.now();
    this.deletePathInternal(path, this.state);
    return this;
  }

  merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON) {
    if (this.isListening(path)) {
      const maxState = Date.now();

      if ("children" in json) {
        for (const [key, child] of Object.entries(json.children)) {
          this.mergePathInternal(path + SEPERATOR + key, child, maxState);
        }
      } else if ("delete" in json) {
        this.mergeDeletePathInternal(path, json.state, maxState);
      } else {
        this.mergePathInternal(path, json, maxState);
      }
    }
    return this;
  }

  listenAtPath(path: string, emit = true) {
    if (emit) {
      this.emit("get", path);
    }
    this.listeningPaths.add(path);
    return this;
  }

  isListening(path: string) {
    for (const listeningPath of this.listeningPaths) {
      if (path.startsWith(listeningPath)) {
        return true;
      }
    }
    return false;
  }

  toJSON(): IGraphJSON {
    return {
      state: this.state,
      entries: Object.entries(this.entries).reduce((entries, [key, value]) => {
        entries[key] = value.toJSON() as any;
        return entries;
      }, {} as IGraphJSON["entries"]),
    };
  }

  private mergePathInternal(
    path: string,
    json: IRefJSON | IEdgeJSON,
    maxState: number
  ) {
    const jsonState = json.state;

    if (jsonState > maxState) {
      setTimeout(
        () => this.mergePathEdgeInternal(path, json),
        jsonState - maxState
      );
    } else {
      this.mergePathEdgeInternal(path, json);
    }

    return this;
  }

  private mergePathEdgeInternal(path: string, json: IRefJSON | IEdgeJSON) {
    const jsonState = json.state,
      node = this.getNodeAtPath(path);

    const jsonValue =
      "value" in json ? json.value : new Ref(this, json.id, jsonState);

    if (node instanceof Edge) {
      if (
        this.shouldOverwriteFn(node.value, node.state, jsonValue, jsonState)
      ) {
        node.value = jsonValue;
        node.state = jsonState;
        this.emit("change", node.getPath(), node.toJSON());
      }
    } else if (node instanceof Node) {
      if (
        this.shouldOverwriteFn(
          new Ref(this, node.getPath(), jsonState),
          node.state,
          jsonValue,
          jsonState
        )
      ) {
        const newNode = this.createEdgeAt(path, jsonState);
        newNode.value = jsonValue;
        this.emit("change", newNode.getPath(), newNode.toJSON());
      }
    } else {
      const newNode = this.createEdgeAt(path, jsonState);
      newNode.value = jsonValue;
      this.emit("change", newNode.getPath(), newNode.toJSON());
    }
    return this;
  }

  private mergeDeletePathInternal(
    path: string,
    jsonState: number,
    maxState: number
  ) {
    if (jsonState > maxState) {
      setTimeout(
        () => this.mergeDeletePathEdgeInternal(path, jsonState),
        jsonState - maxState
      );
    } else {
      this.mergeDeletePathEdgeInternal(path, jsonState);
    }
    return this;
  }

  private mergeDeletePathEdgeInternal(path: string, jsonState: number) {
    const [parentPath, key] = getParentPathAndKey(path),
      node = this.getNodeAtPath(path),
      parent = parentPath ? this.getNodeAtPath(parentPath) : null;

    if (node) {
      if (node.state >= jsonState) {
        if (parent instanceof Node) {
          delete parent.children[key];
          this.emit("change", parentPath as string, parent.toJSON());
        }
      }
    }
    return this;
  }

  private setPathInternal(path: string, value: IGraphValue, state: number) {
    if (value instanceof Ref) {
      this.setEdgePathInternal(path, value, state);
    } else if (value !== null && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) {
        this.setPathInternal(path + SEPERATOR + k, v, state);
      }
    } else {
      this.setEdgePathInternal(path, value, state);
    }
  }

  private setEdgePathInternal(
    path: string,
    value: IPrimitive | Ref,
    state: number
  ) {
    const edge = this.createEdgeAt(path, state);
    edge.value = value;
    const edgePath = edge.getPath(),
      edgeJSON = edge.toJSON();
    this.emit("change", edgePath, edgeJSON);
    this.emit("set", edgePath, edgeJSON);
    return edge;
  }

  private createNodeAt(path: string, state: number): Node {
    const keys = path.split(SEPERATOR),
      key = keys.shift() as string;

    let parent = this.entries[key];

    if (!(parent instanceof Node)) {
      parent = new Node(this, null, key, state);
      this.entries[key] = parent;
    }

    return keys.reduce<Node>((parent, key) => {
      const node = parent.children[key];

      if (node instanceof Node) {
        return node;
      } else if (node instanceof Edge) {
        if (node.value instanceof Ref) {
          const refNode = node.value.getNode();

          if (refNode instanceof Node) {
            return refNode;
          }
        }
      }
      const newNode = new Node(this, parent, key, state);
      parent.children[key] = newNode;
      return newNode;
    }, parent);
  }

  private createEdgeAt(path: string, state: number): Edge {
    const [parentPath, key] = getParentPathAndKey(path),
      parent = parentPath ? this.createNodeAt(parentPath, state) : null;

    let node = parent?.children[key];

    if (node instanceof Edge) {
      node.state = state;
      return node;
    } else {
      node = new Edge(this, parent, key, state, null);
      if (parent) {
        parent.children[key] = node;
      } else {
        this.entries[key] = node;
      }
      return node;
    }
  }

  private deletePathInternal(path: string, state: number) {
    const [parentPath, key] = getParentPathAndKey(path),
      parent = parentPath ? this.createNodeAt(parentPath, state) : null;

    if (parent) {
      delete parent.children[key];
      this.emit("change", path, { state, delete: true });
      this.emit("set", path, { state, delete: true });
    }
  }
}

export function getParentPathAndKey(
  path: string
): [parentPath: string | undefined, key: string] {
  const index = path.lastIndexOf("/");

  if (index === -1) {
    return [undefined, path];
  } else {
    return [path.substring(0, index), path.substring(index + 1)];
  }
}

function getNodeAtPath(
  graph: Graph,
  path: string,
  nodes: { [key: string]: Node | Edge | null }
) {
  const seen = nodes[path];

  if (seen !== undefined) {
    return seen || undefined;
  } else {
    const keys = path.split(SEPERATOR),
      key = keys.shift() as string,
      node = graph.getEntries()[key];

    if (node && keys.length) {
      nodes[key] = node;
      return getNodeAtPathInternal(graph, key, node, keys, nodes);
    } else {
      return node;
    }
  }
}

function getNodeAtPathInternal(
  graph: Graph,
  path: string,
  node: Node | Edge,
  keys: string[],
  nodes: { [key: string]: Node | Edge | null }
): Node | Edge | undefined {
  if (node instanceof Node) {
    const key = keys.shift() as string;

    if (key) {
      const child = node.children[key],
        childPath = path + SEPERATOR + key;

      if (child) {
        nodes[childPath] = child;
        return getNodeAtPathInternal(graph, childPath, child, keys, nodes);
      } else {
        nodes[childPath] = null;
        return undefined;
      }
    } else {
      nodes[path] = node;
      return node;
    }
  } else if (node.value instanceof Ref) {
    const refPath = node.value.getPath(),
      refNode = getNodeAtPath(graph, refPath, nodes);

    if (refNode && refNode !== node) {
      return getNodeAtPathInternal(graph, path, refNode, keys, nodes);
    } else {
      nodes[refPath] = null;
      return undefined;
    }
  } else {
    nodes[path] = node;
    return node;
  }
}

function getValueAtNode<T extends IGraphValue = IGraphValue>(
  graph: Graph,
  node: Node | Edge | undefined,
  seen: Set<string> = new Set()
): IRefValue<T> | undefined {
  if (!node) {
    return undefined;
  } else if (node instanceof Node) {
    const children: IGraph = {};
    for (const [k, c] of Object.entries(node.children)) {
      const childValue =
        c instanceof Edge
          ? c.value
          : (children[k] = new Ref(graph, c.getPath(), c.state));
      children[k] = childValue;
    }
    return children as IRefValue<T>;
  } else if (node.value instanceof Ref) {
    if (seen.has(node.value.getPath())) {
      return undefined;
    } else {
      seen.add(node.value.getPath());
    }
    return getValueAtNode<T>(graph, node.value.getNode(), seen);
  } else {
    return node.value as IRefValue<T>;
  }
}

export type IShouldOverwriteFn = typeof defaultShouldOverwriteFn;

function defaultShouldOverwriteFn(
  localValue: IPrimitive | Ref,
  localState: number,
  remoteValue: IPrimitive | Ref,
  remoteState: number
) {
  return (
    remoteState >= localState &&
    (localState === remoteState
      ? JSON.stringify(remoteValue).length > JSON.stringify(localValue).length
      : true)
  );
}
