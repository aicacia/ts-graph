import { EventEmitter } from "eventemitter3";

export type IKeyOf<T> = Exclude<keyof T, symbol | number>;
export type IValueOf<T> = Extract<T, IPrimitive>;

export type IPrimitive = string | number | boolean | null;

export type IGraph = { [S in string]: IGraphValue } & {
  [S in number]: IGraphValue;
};
export type IGraphValue = IPrimitive | Ref | IGraph;

export type IRefValueChild<T extends IGraphValue> = T extends IGraph
  ? Ref<T>
  : T extends Ref<infer V>
  ? Ref<V>
  : T;

export type IRefValue<T extends IGraphValue> = T extends IGraph
  ? { [K in IKeyOf<T>]: IRefValueChild<T[K]> }
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

export interface INodeJSON extends IEntryJSON {
  children: {
    [key: string | symbol | number]: IEdgeJSON | IRefJSON | INodeJSON;
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

export interface IRefJSON extends IEntryJSON {
  id: string;
}

export class Ref<T extends IGraphValue = IGraphValue>
  implements PromiseLike<IRefValue<T> | undefined>
{
  protected graph: Graph;
  protected path: string;
  protected state: number;
  protected waitMS: number;

  constructor(graph: Graph, path: string, state: number) {
    this.graph = graph;
    this.path = path;
    this.state = state;
    this.waitMS = graph.getWaitMS();
  }

  get<SK extends IKeyOf<T> = IKeyOf<T>>(
    key: SK
  ): Ref<
    T[SK] extends IGraph
      ? T[SK]
      : T[SK] extends Ref<infer V>
      ? V
      : IValueOf<T[SK]>
  > {
    return new Ref(this.graph, this.path + SEPERATOR + key, this.state);
  }
  set(value: T | Ref<T>) {
    this.graph.set(this.path, value);
    return this;
  }
  getValue(): IRefValue<T> | undefined {
    return this.graph.getValueAtPath<T>(this.path);
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

  on(callback: (value: IRefValue<T> | undefined) => void) {
    let currentNode = this.getNode();

    const onChange = (path: string) => {
      const node = this.getNode();

      if (node) {
        const value = node.getValue() as IRefValue<T>;

        if (currentNode !== node) {
          this.graph.listenAtPath(node.getPath(), value === undefined);
          currentNode = node;
        }

        if (path.startsWith(node.getPath())) {
          callback(value);
        }
      } else {
        currentNode = node;
      }
    };
    this.graph.on("change", onChange);

    const value = currentNode?.getValue() as IRefValue<T>;
    this.graph.listenAtPath(
      currentNode?.getPath() || this.path,
      value === undefined
    );

    if (value !== undefined) {
      callback(value);
    }

    return () => {
      this.graph.off("change", onChange);
    };
  }

  getWaitMS() {
    return this.waitMS;
  }
  setWaitMS(waitMS: number) {
    this.waitMS = waitMS;
    return this;
  }

  then<R = IRefValue<T> | undefined, E = never>(
    onfulfilled?:
      | ((value: IRefValue<T> | undefined) => R | PromiseLike<R>)
      | undefined
      | null,
    onrejected?: ((reason: any) => E | PromiseLike<E>) | undefined | null
  ): PromiseLike<R | E> {
    const value = this.getValue();
    let promise: Promise<IRefValue<T> | undefined>;

    if (value !== undefined) {
      promise = Promise.resolve<IRefValue<T> | undefined>(value);
    } else {
      promise = new Promise((resolve, reject) => {
        let resolved = false;
        const off = this.on((value) => {
          resolved = true;
          off();
          resolve(value);
        });
        setTimeout(() => {
          if (!resolved) {
            reject(
              new Error(`Request took longer than ${this.waitMS}ms to resolve`)
            );
            off();
          }
        }, this.waitMS);
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
  protected state = Date.now();
  protected entries: Map<string, Node | Edge> = new Map();
  protected listeningPaths: Set<string> = new Set();
  protected waitMS = 5000;

  setWaitMS(waitMS: number) {
    this.waitMS = waitMS;
    return this;
  }
  getWaitMS() {
    return this.waitMS;
  }

  getEntries(): ReadonlyMap<string, Node | Edge> {
    return this.entries;
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
    return getNodeAtPath(this, path, new Map());
  }

  set(path: string, value: IGraphValue) {
    this.state = Date.now();
    this.setPathInternal(path, value, this.state);
    return this;
  }

  merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON) {
    if (this.isListening(path)) {
      this.mergePathInternal(path, json);
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

  private mergePathInternal(
    path: string,
    json: IRefJSON | IEdgeJSON | INodeJSON
  ) {
    const jsonState = json.state;
    let node = this.getNodeAtPath(path);

    if ("children" in json) {
      if (node instanceof Edge) {
        if (shouldOverwrite(node.value, node.state, node.value, jsonState)) {
          node = this.createNodeAt(path, jsonState);
          this.emit("change", node.getPath(), node.toJSON());
        }
      } else if (!node) {
        node = this.createNodeAt(path, jsonState);
        this.emit("change", node.getPath(), node.toJSON());
      }

      if (node instanceof Node) {
        for (const [key, child] of Object.entries(json.children)) {
          this.mergePathInternal(node.getPath() + SEPERATOR + key, child);
        }
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
      if (parent) {
        parent?.children.set(key, node);
      } else {
        this.entries.set(key, node);
      }
      return node;
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
  nodes: Map<string, Node | Edge | null>
) {
  const seen = nodes.get(path);

  if (seen !== undefined) {
    return seen || undefined;
  } else {
    const keys = path.split(SEPERATOR),
      key = keys.shift() as string,
      node = graph.getEntries().get(key);

    if (node && keys.length) {
      nodes.set(key, node);
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
  nodes: Map<string, Node | Edge | null> = new Map()
): Node | Edge | undefined {
  if (node instanceof Node) {
    const key = keys.shift() as string;

    if (key) {
      const child = node.children.get(key),
        childPath = path + SEPERATOR + key;

      if (child) {
        nodes.set(childPath, child);
        return getNodeAtPathInternal(graph, childPath, child, keys, nodes);
      } else {
        nodes.set(childPath, null);
        return undefined;
      }
    } else {
      nodes.set(path, node);
      return node;
    }
  } else if (node.value instanceof Ref) {
    const refPath = node.value.getPath(),
      refNode = getNodeAtPath(graph, refPath, nodes);

    if (refNode && refNode !== node) {
      return getNodeAtPathInternal(graph, path, refNode, keys, nodes);
    } else {
      nodes.set(refPath, null);
      return undefined;
    }
  } else {
    nodes.set(path, node);
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
    for (const [k, c] of node.children) {
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

function shouldOverwrite(
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
