import { EventEmitter } from "eventemitter3";
export declare type IKeyOf<T> = Exclude<keyof T, symbol | number>;
export declare type IPrimitive = string | number | boolean | null;
export declare type IGraph = {
    [S in string]: IGraphNode;
} & {
    [S in number]: IGraphNode;
};
export declare type IGraphNode = IPrimitive | Ref | IGraph;
export declare type IRefValueChild<T extends IGraphNode> = T extends IGraph ? Ref<T> : T;
export declare type IRefValue<T extends IGraphNode> = T extends IGraph ? {
    [K in IKeyOf<T>]: IRefValueChild<T[K]>;
} : T;
export declare type IValue<T extends IGraphNode> = T extends IGraph ? {
    [K in IKeyOf<T>]: IValue<T[K]>;
} : T extends Ref<infer V> ? V : T;
export declare const SEPERATOR = "/";
export interface IEntryJSON {
    state: number;
}
export declare class Entry {
    graph: Graph;
    parent: Entry | null;
    key: string;
    state: number;
    constructor(graph: Graph, parent: Entry | null, key: string, state: number);
    getPath(): string;
    toJSON(): IEntryJSON;
}
export interface INodeJSON extends IEntryJSON {
    children: {
        [key: string | symbol | number]: IEdgeJSON | IRefJSON | INodeJSON;
    };
}
export declare class Node extends Entry {
    children: Map<string, Edge | Node>;
    toJSON(): INodeJSON;
}
export interface IEdgeJSON extends IEntryJSON {
    value: IPrimitive;
}
export declare class Edge extends Entry {
    value: IPrimitive | Ref;
    constructor(graph: Graph, parent: Entry | null, key: string, state: number, value: IPrimitive);
    toJSON(): IEdgeJSON | IRefJSON;
}
export interface IRefJSON extends IEntryJSON {
    id: string;
}
export declare class Ref<T extends IGraphNode = IGraphNode> implements PromiseLike<IValue<T> | undefined> {
    protected graph: Graph;
    protected path: string;
    protected state: number;
    constructor(graph: Graph, path: string, state: number);
    get<SK extends IKeyOf<T> = IKeyOf<T>>(key: SK): Ref<T[SK] extends IGraph ? T[SK] : T[SK] extends Ref<infer V> ? V : IPrimitive>;
    set(value: T | Ref<T>): this;
    getValue(): IValue<T> | undefined;
    getRefValue(): IRefValue<T> | undefined;
    getPath(): string;
    getNode(): Node | Edge | undefined;
    getState(): number;
    on(callback: (value: IRefValue<T> | undefined) => void): () => void;
    then<R = IValue<T> | undefined, E = never>(onfulfilled?: ((value: IValue<T> | undefined) => R | PromiseLike<R>) | undefined | null, onrejected?: ((reason: any) => E | PromiseLike<E>) | undefined | null): PromiseLike<R | E>;
    toJSON(): IRefJSON;
}
export interface IGraphEvents<T extends IGraph> {
    get(this: Graph<T>, path: string): void;
    set(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON): void;
    change(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON | INodeJSON): void;
}
export declare class Graph<T extends IGraph = IGraph> extends EventEmitter<IGraphEvents<T>> {
    protected listening: Set<string>;
    protected state: number;
    protected entries: Map<string, Node | Edge>;
    getEntries(): ReadonlyMap<string, Node | Edge>;
    get<K extends IKeyOf<T> = IKeyOf<T>>(key: K): Ref<T[K]>;
    getValueAtPath<V extends IGraphNode = IGraphNode>(path: string): IValue<V> | undefined;
    getRefValueAtPath<V extends IGraphNode = IGraphNode>(path: string): IRefValue<V> | undefined;
    getNodeAtPath(path: string): Node | Edge | undefined;
    set(path: string, value: IGraphNode): this;
    merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON): this;
    listenTo(path: string): this;
    isListeningTo(path: string): boolean;
    toJSON(): {
        [key: string]: INodeJSON | IEdgeJSON | IRefJSON;
        [key: number]: INodeJSON | IEdgeJSON | IRefJSON;
        [key: symbol]: INodeJSON | IEdgeJSON | IRefJSON;
    };
    private mergePathInternal;
    private setPathInternal;
    private setEdgePathInternal;
    private createNodeAt;
    private createEdgeAt;
}
export declare function getParentPath(path: string): string | undefined;
export declare function getParentPathAndKey(path: string): [parentPath: string | undefined, key: string];
