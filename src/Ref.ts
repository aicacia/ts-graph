import type { Graph } from "./Graph";
import type { IEntryJSON } from "./Entry";
import {
  IGraph,
  IGraphValue,
  IKeyOf,
  IRefValue,
  IValueOf,
  SEPERATOR,
} from "./types";

export interface IRefJSON extends IEntryJSON {
  id: string;
}

export class Ref<T extends IGraphValue = IGraphValue>
  implements PromiseLike<IRefValue<T> | undefined>
{
  protected graph: Graph;
  protected path: string;
  protected state: number;
  protected waitMS: number | undefined;

  constructor(graph: Graph, path: string, state: number) {
    this.graph = graph;
    this.path = path;
    this.state = state;
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

  once(callback: (value: IRefValue<T> | undefined) => void) {
    const off = this.on((value) => {
      off();
      callback(value);
    });
    return this;
  }

  getWaitMS() {
    return this.waitMS === undefined ? this.graph.getWaitMS() : this.waitMS;
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
  ): Promise<R | E> {
    const value = this.getValue();
    let promise: Promise<IRefValue<T> | undefined>;

    if (value !== undefined) {
      promise = Promise.resolve<IRefValue<T> | undefined>(value);
    } else {
      promise = new Promise((resolve, reject) => {
        const off = this.on((value) => {
          clearTimeout(timeoutId);
          off();
          resolve(value);
        });
        const timeoutId = setTimeout(() => {
          off();
          reject(
            new Error(
              `Request took longer than ${this.getWaitMS()}ms to resolve`
            )
          );
        }, this.getWaitMS());
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
