import { EventEmitter } from "eventemitter3";

export type IKeyOf<T> = Exclude<keyof T, symbol | number>;

export type IPrimitive = string | number | boolean | null;

export type IGraph = { [S in string]: IGraphNode } & {
  [S in number]: IGraphNode;
};
export type IGraphNode = IPrimitive | Ref | IGraph;

export type IReturn<T extends IGraphNode> = T extends IGraph
  ? { [K in IKeyOf<T>]: IReturn<T[K]> }
  : T extends Ref<infer V>
  ? V
  : T;

export const SEPERATOR = "/";

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

export interface INodeJSON extends IEntryJSON {
  children: {
    [key: string | symbol | number]: IEdgeJSON | IRefJSON | INodeJSON;
  };
}

export class Node extends Entry {
  children: Map<string, Edge | Node> = new Map();

  toNodesJSON() {
    return nodeMapToJSON(this.children, {}, this.getPath(), false);
  }

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
      state: this.state,
      children,
    };
  }
}

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
    this.state = state;
    this.value = value;
  }

  toJSON(): IEdgeJSON | IRefJSON {
    return this.value instanceof Ref
      ? this.value.toJSON()
      : { state: this.state, value: this.value };
  }
}

export interface IRefJSON extends IEntryJSON {
  id: string;
}

export class Ref<T extends IGraphNode = IGraphNode>
  implements PromiseLike<IReturn<T> | undefined>
{
  protected graph: Graph;
  protected path: string;
  protected state: number;

  constructor(graph: Graph, path: string, state: number) {
    this.graph = graph;
    this.path = path;
    this.state = state;
  }

  get<SK extends IKeyOf<T> = IKeyOf<T>>(
    key: SK
  ): Ref<
    T[SK] extends IGraph ? T[SK] : T[SK] extends Ref<infer V> ? V : IPrimitive
  > {
    return new Ref(this.graph, this.path + SEPERATOR + key, this.state);
  }
  set(value: T | Ref<T>) {
    this.graph.set(this.path, value);
    return this;
  }
  getValue(): IReturn<T> | undefined {
    return this.graph.getValueAtPath(this.path) as IReturn<T>;
  }
  getPath() {
    return this.path;
  }
  getNode() {
    return this.graph.getNodeAtPath(this.path);
  }
  getState() {
    return this.state;
  }

  on(callback: (value: IReturn<T> | undefined) => void) {
    const onChange = (path: string) => {
      if (path.startsWith(this.path)) {
        callback(this.getValue());
      }
    };
    this.graph.on("change", onChange);
    const value = this.getValue();
    if (value !== undefined) {
      callback(value);
    }
    return () => {
      this.graph.off("change", onChange);
    };
  }

  then<R = IReturn<T> | undefined, E = never>(
    onfulfilled?:
      | ((value: IReturn<T> | undefined) => R | PromiseLike<R>)
      | undefined
      | null,
    onrejected?: ((reason: any) => E | PromiseLike<E>) | undefined | null
  ): PromiseLike<R | E> {
    const value = this.getValue();
    let promise: PromiseLike<IReturn<T> | undefined>;

    if (value !== undefined) {
      if (value instanceof Ref) {
        promise = value.then();
      } else {
        promise = Promise.resolve<IReturn<T>>(value);
      }
    } else {
      promise = new Promise((resolve) => {
        const onChange = (path: string) => {
          if (path.startsWith(this.path)) {
            resolve(this.getValue());
          }
        };
        this.graph.once("change", onChange);
      });
    }
    return promise.then(onfulfilled, onrejected);
  }

  toJSON(): IRefJSON {
    return {
      id: this.path,
      state: this.state,
    };
  }
}

export interface IGraphEvents<T extends IGraph> {
  get(this: Graph<T>, path: string): void;
  set(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON): void;
  change(
    this: Graph<T>,
    path: string,
    value: IRefJSON | IEdgeJSON | INodeJSON
  ): void;
}

export class Graph<T extends IGraph = IGraph> extends EventEmitter<
  IGraphEvents<T>
> {
  protected listening: Set<string> = new Set();
  protected state = Date.now();
  protected entries: Map<string, Node | Edge> = new Map();

  getEntries(): ReadonlyMap<string, Node | Edge> {
    return this.entries;
  }

  get<K extends IKeyOf<T> = IKeyOf<T>>(key: K): Ref<T[K]> {
    return new Ref(this, key, this.state);
  }

  getValueAtPath(path: string) {
    const keys = path.split(SEPERATOR),
      node = this.entries.get(keys.shift() as string);

    if (node) {
      return getValueAtPath(keys, node, new Map());
    } else {
      this.listenTo(path);
      return undefined;
    }
  }

  getNodeAtPath(path: string) {
    const keys = path.split(SEPERATOR),
      node = this.entries.get(keys.shift() as string);

    return getNodeAtPath(keys, node);
  }

  set(path: string, value: IGraphNode) {
    this.state = Date.now();
    this.setPathInternal(path, value, this.state);
    return this;
  }

  merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON) {
    if (this.isListeningTo(path)) {
      this.mergePathInternal(path, json);
    }
    return this;
  }

  listenTo(path: string) {
    this.listening.add(path);
    this.emit("get", path);
    return this;
  }

  isListeningTo(path: string) {
    for (const listeningPath of this.listening) {
      if (path.startsWith(listeningPath)) {
        return true;
      }
    }
    return false;
  }

  toJSON() {
    return nodeMapToJSON(this.entries, {}, undefined, true);
  }

  private mergePathInternal(
    path: string,
    json: IRefJSON | IEdgeJSON | INodeJSON
  ) {
    const jsonState = json.state;
    let node = this.getNodeAtPath(path);

    if ("children" in json) {
      if (node instanceof Edge) {
        if (
          (node.value instanceof Ref &&
            node.value.getPath() === path &&
            node.value.getState() >= jsonState) ||
          shouldOverwrite(
            node.value,
            node.state,
            new Ref(this, path, jsonState),
            jsonState
          )
        ) {
          node = this.createNodeAt(path, jsonState);
        }
      } else if (!node) {
        node = this.createNodeAt(path, jsonState);
      }

      if (node instanceof Node) {
        for (const [key, child] of Object.entries(json.children)) {
          this.mergePathInternal(node.getPath() + SEPERATOR + key, child);
        }
        this.emit("change", node.getPath(), node.toJSON());
      }
    } else {
      const jsonValue =
        "value" in json ? json.value : new Ref(this, json.id, jsonState);

      if (node instanceof Edge) {
        if (shouldOverwrite(node.value, node.state, jsonValue, jsonState)) {
          node.value = jsonValue;
          node.state = jsonState;
          this.emit("change", node.getPath(), node.toJSON());
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
          const newNode = this.createEdgeAt(path, jsonState);
          newNode.value = jsonValue;
          this.emit("change", newNode.getPath(), newNode.toJSON());
        }
      } else {
        const newNode = this.createEdgeAt(path, jsonState);
        newNode.value = jsonValue;
        this.emit("change", newNode.getPath(), newNode.toJSON());
      }
    }
    return this;
  }

  private setPathInternal(path: string, value: IGraphNode, state: number) {
    if (value instanceof Ref) {
      this.setEdgePathInternal(path, value, state);
    } else if (value != null && typeof value === "object") {
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

    let parent = this.entries.get(key);

    if (!(parent instanceof Node)) {
      parent = new Node(this, null, key, state);
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
      return newNode;
    }, parent);
  }

  private createEdgeAt(path: string, state: number): Edge {
    const [parentPath, key] = getParentPathAndKey(path),
      parent = parentPath ? this.createNodeAt(parentPath, state) : null;

    let node = parent?.children.get(key);

    if (node instanceof Edge) {
      node.state = state;
      return node;
    } else {
      node = new Edge(this, parent, key, state, null);
      parent?.children.set(key, node);
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

function getValueAtPath(
  keys: string[],
  node: Node | Edge | undefined,
  values: Map<Node | Edge, IGraphNode | undefined>
): IGraphNode | undefined {
  if (!node) {
    return undefined;
  }
  const seen = values.get(node);
  if (seen) {
    return seen;
  }
  if (node instanceof Node) {
    const key = keys.shift() as string;

    if (key) {
      const child = node.children.get(key);

      if (child) {
        return getValueAtPath(keys, child, values);
      } else {
        node.graph.listenTo(node.getPath() + SEPERATOR + key);
        values.set(node, undefined);
        return undefined;
      }
    } else {
      const children: {
        [key: string]: IGraphNode;
      } = {};
      values.set(node, children);
      for (const [k, c] of node.children) {
        const childPath = node.getPath() + SEPERATOR + k;
        if (
          c instanceof Edge &&
          c.value instanceof Ref &&
          c.getPath() === childPath
        ) {
          children[k] = new Ref(node.graph, childPath, c.state);
        } else {
          const value = getValueAtPath(keys, c, values);

          if (value !== undefined) {
            children[k] = value;
          } else {
            children[k] = new Ref(node.graph, childPath, c.state);
          }
        }
      }
      return children;
    }
  } else if (node.value instanceof Ref) {
    if (node.getPath() === node.value.getPath()) {
      node.graph.listenTo(node.value.getPath());
      values.set(node, undefined);
      return undefined;
    }
    const refNode = node.value.getNode();

    if (refNode) {
      return getValueAtPath(keys, refNode, values);
    } else {
      node.graph.listenTo(node.value.getPath());
      values.set(node, undefined);
      return undefined;
    }
  }
  values.set(node, node.value);
  return node.value;
}

function getNodeAtPath(
  keys: string[],
  node: Node | Edge | undefined
): Node | Edge | undefined {
  if (!node) {
    return undefined;
  } else if (node instanceof Node) {
    const key = keys.shift() as string;

    if (key) {
      const child = node.children.get(key);

      if (child) {
        return getNodeAtPath(keys, child);
      } else {
        return undefined;
      }
    } else {
      return node;
    }
  } else if (node.value instanceof Ref) {
    if (node.getPath() === node.value.getPath()) {
      return node;
    }
    const refNode = node.value.getNode();

    if (refNode) {
      return getNodeAtPath(keys, refNode);
    } else {
      return undefined;
    }
  }
  return node;
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

function nodeMapToJSON(
  entries: Map<string, Edge | Node>,
  json: { [key: string | symbol | number]: IEdgeJSON | IRefJSON | INodeJSON },
  path?: string,
  recur = false
) {
  const prefix = path ? path + SEPERATOR : "";
  entries.forEach((child, key) => {
    if (child instanceof Node) {
      if (recur) {
        nodeMapToJSON(child.children, json, prefix + key, recur);
      } else {
        json[prefix + key] = child.toJSON();
      }
    } else {
      json[prefix + key] = child.toJSON();
    }
  });
  return json;
}
