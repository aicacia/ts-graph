import { EventEmitter } from "eventemitter3";
export declare type IKeyOf<T> = Exclude<keyof T, symbol | number>;
export declare type IValueOf<T> = Extract<T, IPrimitive>;
export declare type IPrimitive = string | number | boolean | null;
export declare type IGraph = {
    [S in string]: IGraphValue;
} & {
    [S in number]: IGraphValue;
};
export declare type IGraphValue = IPrimitive | Ref | IGraph;
export declare type IRefValueChild<T extends IGraphValue> = T extends IGraph ? Ref<T> : T extends Ref<infer V> ? Ref<V> : T;
export declare type IRefValue<T extends IGraphValue> = T extends IGraph ? {
    [K in IKeyOf<T>]: IRefValueChild<T[K]>;
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
    getValue(): string | number | boolean | Ref<IGraphValue> | IGraph | {
        [x: string]: IPrimitive | Ref<IGraphValue> | Ref<IGraph>;
    } | null | undefined;
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
    getPath(): string;
    toJSON(): IEdgeJSON | IRefJSON;
}
export interface IRefJSON extends IEntryJSON {
    id: string;
}
export declare class Ref<T extends IGraphValue = IGraphValue> implements PromiseLike<IRefValue<T> | undefined> {
    protected graph: Graph;
    protected path: string;
    protected state: number;
    constructor(graph: Graph, path: string, state: number);
    get<SK extends IKeyOf<T> = IKeyOf<T>>(key: SK): Ref<T[SK] extends IGraph ? T[SK] : T[SK] extends Ref<infer V> ? V : IValueOf<T[SK]>>;
    set(value: T | Ref<T>): this;
    getValue(): IRefValue<T> | undefined;
    getPath(): string;
    getNode(): Node | Edge | undefined;
    getState(): number;
    on(callback: (value: IRefValue<T> | undefined) => void): () => void;
    then<R = IRefValue<T> | undefined, E = never>(onfulfilled?: ((value: IRefValue<T> | undefined) => R | PromiseLike<R>) | undefined | null, onrejected?: ((reason: any) => E | PromiseLike<E>) | undefined | null): PromiseLike<R | E>;
    toJSON(): IRefJSON;
}
export interface IGraphEvents<T extends IGraph> {
    get(this: Graph<T>, path: string): void;
    set(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON): void;
    change(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON | INodeJSON): void;
}
export declare class Graph<T extends IGraph = IGraph> extends EventEmitter<IGraphEvents<T>> {
    protected state: number;
    protected entries: Map<string, Node | Edge>;
    protected listeningPaths: Set<string>;
    getEntries(): ReadonlyMap<string, Node | Edge>;
    get<K extends IKeyOf<T> = IKeyOf<T>>(key: K): Ref<T[K]>;
    getValueAtPath<V extends IGraphValue = IGraphValue>(path: string): IRefValue<V> | undefined;
    getNodeAtPath(path: string): Node | Edge | undefined;
    set(path: string, value: IGraphValue): this;
    merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON): this;
    listenAtPath(path: string): this;
    isListening(path: string): boolean;
    private mergePathInternal;
    private setPathInternal;
    private setEdgePathInternal;
    private createNodeAt;
    private createEdgeAt;
}
export declare function getParentPathAndKey(path: string): [parentPath: string | undefined, key: string];
