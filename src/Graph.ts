import { EventEmitter } from "eventemitter3";

export type IKey = string | number | symbol;
export type IPrimitive = string | number | boolean | null;
export type IValue = IPrimitive | { [key: string]: IValue };
export type ISetValue = IPrimitive | GraphRef | { [key: IKey]: ISetValue };

export const SEPERATOR = "/";

class Entry {
  graph: Graph;
  parent: Node | null;
  key: string;
  state: number;

  constructor(graph: Graph, parent: Node | null, key: string, state: number) {
    this.graph = graph;
    this.parent = parent;
    this.key = key;
    this.state = state;
  }

  getPath(): string {
    if (this.parent) {
      return this.parent.getPath() + SEPERATOR + this.key;
    } else {
      return this.key;
    }
  }
  getChildPath(key: string): string {
    return this.getPath() + SEPERATOR + key;
  }
}

export interface IEdgeJSON {
  value: IPrimitive;
  state: number;
}

class Edge extends Entry {
  value: IPrimitive | Ref;

  constructor(
    graph: Graph,
    parent: Node | null,
    key: string,
    value: IPrimitive | Ref,
    state: number
  ) {
    super(graph, parent, key, state);
    this.value = value;
  }

  isEmpty(): boolean {
    return (
      this.value == null || (this.value instanceof Ref && this.value.isEmpty())
    );
  }
  toJSON(): IEdgeJSON | IRefJSON {
    return this.value instanceof Ref
      ? this.value.toJSON()
      : { value: this.value, state: this.state };
  }
  toGraphJSON(json: IGraphJSON = {}): IGraphJSON {
    return toGraphJSONInternal(this, json);
  }
}

export interface INodeJSON {
  state: number;
}

class Node extends Entry {
  children: Map<string, Node | Edge> = new Map();

  isEmpty(): boolean {
    return (
      this.children.size === 0 ||
      Array.from(this.children.values()).every((child) => child.isEmpty())
    );
  }
  toJSON(): INodeJSON {
    return { state: this.state };
  }
  toGraphJSON(json: IGraphJSON = {}): IGraphJSON {
    return toGraphJSONInternal(this, json);
  }
}

export interface IRefJSON {
  id: string;
  state: number;
}

class Ref {
  graph: Graph;
  path: string;
  state: number;

  constructor(graph: Graph, path: string, state: number) {
    this.graph = graph;
    this.path = path;
    this.state = state;
  }

  get value() {
    return this.getValue();
  }
  get node() {
    return this.getNode();
  }

  getValue() {
    return this.graph.getPathValue(this.path);
  }
  getNode() {
    return this.graph.getPathNode(this.path);
  }

  isEmpty(): boolean {
    const node = this.getNode();
    return node ? node.isEmpty() : true;
  }
  toJSON(): IRefJSON {
    return { id: this.path, state: this.state };
  }
}

export class GraphRef {
  private graph: Graph;
  private parent: GraphRef | null;
  private key: string;

  static fromPath(graph: Graph, path = "") {
    return path
      .split(SEPERATOR)
      .reduce<GraphRef | null>(
        (parent, part) => new GraphRef(graph, parent, part),
        null
      );
  }

  constructor(graph: Graph, parent: GraphRef | null, key: string) {
    this.graph = graph;
    this.parent = parent;
    this.key = key;
  }

  set(value: ISetValue) {
    this.graph.setAtPath(this.getPath(), value);
    return this;
  }
  get(key: string) {
    return new GraphRef(this.graph, this, key);
  }
  getValue() {
    return this.graph.getPathValue(this.getPath());
  }
  getNode() {
    return this.graph.getPathNode(this.getPath());
  }
  on(callback: (value: IValue | undefined) => void) {
    const onChange = (json: IGraphJSON) => {
      const node = this.getNode();

      if (node) {
        if (Object.keys(json).some((key) => key.startsWith(node.getPath()))) {
          callback(this.graph.getPathValue(this.getPath()));
        }
      }
    };
    this.graph.on("change", onChange);
    return () => {
      this.graph.off("change", onChange);
    };
  }

  getPath(): string {
    if (this.parent) {
      return this.parent.getPath() + SEPERATOR + this.key;
    } else {
      return this.key;
    }
  }
  getChildPath(key: string): string {
    return this.getPath() + SEPERATOR + key;
  }
}

export interface IGraphJSON {
  [key: string]: INodeJSON | IEdgeJSON | IRefJSON;
}

export interface IGraphEvents {
  get(this: Graph, path: string): void;
  set(this: Graph, json: IGraphJSON): void;
  change(this: Graph, json: IGraphJSON): void;
}

export class Graph extends EventEmitter<IGraphEvents> {
  protected entries = new Map<string, Edge | Node>();
  protected state = Date.now();
  protected invalidStates: Array<
    [path: string, json: INodeJSON | IEdgeJSON | IRefJSON]
  > = [];
  protected invalidStateTimeoutId: unknown | undefined;
  protected lastMaxInvalidState = Infinity;

  getEntries(): ReadonlyMap<string, Edge | Node> {
    return this.entries;
  }

  get(key: string): GraphRef {
    return new GraphRef(this, null, key);
  }
  getPathValue(path: string, emit = true): IValue | undefined {
    const node = this.getPathNode(path);
    let value: IValue | undefined;

    if (node) {
      value = getNodeValue(node);
      path = node.getPath();
    }
    if (value === undefined && emit) {
      this.emit("get", path);
    }
    return value;
  }
  getPathNode(path: string) {
    return getPathNode(this, path);
  }

  setAtPath(path: string, value: ISetValue) {
    this.state = Date.now();
    const node = this.setInternal(path, value, this.state),
      json = node.toGraphJSON();
    this.emit("set", json);
    this.emit("change", json);
    return this;
  }

  merge(json: IGraphJSON) {
    const maxState = Date.now(),
      prevInvalidStates = this.invalidStates.length,
      merged: IGraphJSON = {};

    let maxInvalidState = maxState,
      wasMerged = false;
    for (const [key, value] of Object.entries(json)) {
      if (value.state <= maxState) {
        this.mergeInternal(key, value);
        merged[key] = value;
        wasMerged = true;
      } else {
        const index = this.invalidStates.findIndex(
          ([_, j]) => value.state < j.state
        );
        maxInvalidState = Math.max(maxInvalidState, value.state);

        if (index === -1) {
          this.invalidStates.push([key, value]);
        } else {
          this.invalidStates.splice(index, 0, [key, value]);
        }
      }
    }
    if (prevInvalidStates !== this.invalidStates.length) {
      this.handleInvalidStates(maxState, maxInvalidState);
    }
    if (wasMerged) {
      this.state = maxState;
    }
    this.emit("change", merged);
    return this;
  }

  toJSON() {
    return Array.from(this.entries.values()).reduce(
      (json, node) => node.toGraphJSON(json),
      {} as IGraphJSON
    );
  }

  private mergeInternal(path: string, json: INodeJSON | IEdgeJSON | IRefJSON) {
    const jsonState = json.state,
      node = this.getPathNode(path);

    if (!("value" in json) && !("id" in json)) {
      if (!node || node instanceof Edge) {
        if (node) {
          this.deleteInternal(path);
        }
        this.getOrCreateNode(path, jsonState);
      }
    } else {
      const jsonValue =
        "value" in json ? json.value : new Ref(this, json.id, jsonState);

      if (node instanceof Edge) {
        if (shouldOverwrite(node.value, node.state, jsonValue, jsonState)) {
          node.value = jsonValue;
          node.state = jsonState;
        }
      } else if (node instanceof Node) {
        if (
          shouldOverwrite(
            new Ref(this, node.getPath(), jsonState),
            node.state,
            jsonValue,
            jsonState
          )
        ) {
          this.deleteInternal(path);
          this.getOrCreateEdge(path, jsonState).value = jsonValue;
        }
      } else {
        this.getOrCreateEdge(path, jsonState).value = jsonValue;
      }
    }
  }

  private handleInvalidStates(maxState: number, maxInvalidState: number) {
    if (maxInvalidState < this.lastMaxInvalidState) {
      this.lastMaxInvalidState = maxInvalidState;
      clearTimeout(this.invalidStateTimeoutId as number);
      this.invalidStateTimeoutId = undefined;
    }
    if (this.invalidStateTimeoutId) {
      return;
    }
    this.invalidStateTimeoutId = setTimeout(() => {
      const newMaxState = Date.now(),
        invalidStates = this.invalidStates,
        graphJSON: IGraphJSON = {};

      this.invalidStateTimeoutId = undefined;

      let index = -1;
      for (let i = invalidStates.length - 1; i >= 0; i--) {
        const [path, json] = invalidStates[i];

        if (json.state <= newMaxState) {
          this.mergeInternal(path, json);
          graphJSON[path] = json;
          index = i;
        }
      }

      if (index !== -1) {
        invalidStates.splice(index, invalidStates.length - index);
        this.state = newMaxState;
        this.emit("change", graphJSON);
      }
      if (invalidStates.length) {
        this.handleInvalidStates(newMaxState, invalidStates[0][1].state);
      }
    }, maxInvalidState - maxState);
  }

  private deleteInternal(path: string) {
    const node = this.getPathNode(path);

    if (node instanceof Node) {
      for (const key of node.children.keys()) {
        this.deleteInternal(node.getChildPath(key));
      }
    }
    if (node) {
      this.entries.delete(node.getPath());
    }
  }

  private setInternal(path: string, value: ISetValue, state: number) {
    let node = this.getPathNode(path);

    if (value != null && typeof value === "object") {
      if (value instanceof GraphRef) {
        if (node instanceof Node || !node) {
          if (node) {
            this.deleteInternal(node.getPath());
          }
          node = this.getOrCreateEdge(path, state);
        }
        node.value = new Ref(this, value.getPath(), state);
        node.state = state;
        return node;
      } else {
        if (node instanceof Edge || !node) {
          if (node) {
            this.deleteInternal(node.getPath());
          }
          node = this.getOrCreateNode(path, state);
        }

        for (const [k, v] of Object.entries(value)) {
          node.children.set(
            k,
            this.setInternal(node.getChildPath(k), v, state)
          );
        }

        return node;
      }
    } else {
      if (node instanceof Node || !node) {
        if (node) {
          this.deleteInternal(node.getPath());
        }
        node = this.getOrCreateEdge(path, state);
      }
      node.value = value;
      node.state = state;
      return node;
    }
  }

  private getOrCreateNode(path: string, state: number): Node {
    const keys = path.split(SEPERATOR),
      key = keys.shift() as string;

    let parent = this.entries.get(key);

    if (!(parent instanceof Node)) {
      parent = new Node(this, null, key, this.state);
      this.entries.set(key, parent);
    }

    return keys.reduce<Node>((parent, key) => {
      const node = parent.children.get(key);

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
      parent.children.set(key, newNode);
      this.entries.set(newNode.getPath(), newNode);
      return newNode;
    }, parent);
  }

  private getOrCreateEdge(path: string, state: number): Edge {
    const [parentPath, key] = getParentPathAndKey(path),
      parent = parentPath ? this.getOrCreateNode(parentPath, state) : null;

    let node = parent?.children.get(key);

    if (node instanceof Edge) {
      return node;
    } else {
      node = new Edge(this, parent, key, null, state);
      parent?.children.set(key, node);
      this.entries.set(path, node);
      return node;
    }
  }
}

export function getParentPath(path: string) {
  const index = path.lastIndexOf("/");

  if (index === -1) {
    return undefined;
  } else {
    return path.substring(index + 1);
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

export function getNodeValue(
  node: Node | Edge | undefined
): IValue | undefined {
  return getNodeValueInternal(node, new Map());
}

function getNodeValueInternal(
  node: Node | Edge | undefined,
  values: Map<Node | Edge | undefined, IValue | undefined>
): IValue | undefined {
  if (!node) {
    return undefined;
  }
  const seen = values.get(node);
  if (seen) {
    return seen;
  }
  if (node instanceof Edge) {
    if (node.value instanceof Ref) {
      const value = getNodeValueInternal(node.value.getNode(), values) || null;
      values.set(node, value);
      return value;
    } else {
      const value = node.value;
      values.set(node, value);
      return value;
    }
  } else if (node instanceof Node) {
    const children: { [key: string]: IValue } = {};
    values.set(node, children);
    for (const key of node.children.keys()) {
      children[key] =
        getNodeValueInternal(node.children.get(key), values) || null;
    }
    return children;
  }
  values.set(node, undefined);
  return undefined;
}

export function toGraphJSON(node: Node | Edge) {
  return toGraphJSONInternal(node, {});
}

function toGraphJSONInternal(node: Node | Edge, json: IGraphJSON) {
  json[node.getPath()] = node.toJSON();

  if (node instanceof Node) {
    for (const child of node.children.values()) {
      toGraphJSONInternal(child, json);
    }
  }

  return json;
}

function getPathNode(graph: Graph, path: string): Node | Edge | undefined {
  const keys = path.split(SEPERATOR),
    key = keys.shift() as string,
    node = graph.getEntries().get(key);

  if (node) {
    return followNodePath(keys, node);
  } else {
    return undefined;
  }
}

function followNodePath(
  keys: string[],
  node: Node | Edge
): Node | Edge | undefined {
  if (keys.length === 0) {
    return node;
  } else if (node instanceof Node) {
    const key = keys.shift() as string,
      child = node.children.get(key);

    if (child) {
      return followNodePath(keys, child);
    }
  } else if (node.value instanceof Ref) {
    const refNode = node.value.getNode();

    if (refNode) {
      return followNodePath(keys, refNode);
    }
  }
  return undefined;
}

function shouldOverwrite(
  localValue: IPrimitive | Ref,
  localState: number,
  remoteValue: IPrimitive | Ref,
  remoteState: number
) {
  return (
    remoteState >= localState &&
    (localState === remoteState
      ? JSON.stringify(remoteValue) > JSON.stringify(localValue)
      : true)
  );
}
