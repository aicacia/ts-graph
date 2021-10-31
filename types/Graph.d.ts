import { EventEmitter } from "eventemitter3";
export declare type IKey = string | number | symbol;
export declare type IPrimitive = string | number | boolean | null;
export declare type IValue = IPrimitive | {
    [key: string]: IValue;
};
export declare type ISetValue = IPrimitive | GraphRef | {
    [key: IKey]: ISetValue;
};
export declare const SEPERATOR = "/";
declare class Entry {
    graph: Graph;
    parent: Node | null;
    key: string;
    state: number;
    constructor(graph: Graph, parent: Node | null, key: string, state: number);
    getPath(): string;
    getChildPath(key: string): string;
}
export interface IEdgeJSON {
    value: IPrimitive;
    state: number;
}
declare class Edge extends Entry {
    value: IPrimitive | Ref;
    constructor(graph: Graph, parent: Node | null, key: string, value: IPrimitive | Ref, state: number);
    isEmpty(): boolean;
    toJSON(): IEdgeJSON | IRefJSON;
}
export interface INodeJSON {
    state: number;
}
declare class Node extends Entry {
    children: Map<string, Node | Edge>;
    isEmpty(): boolean;
    toJSON(): INodeJSON;
}
export interface IRefJSON {
    id: string;
    state: number;
}
declare class Ref {
    graph: Graph;
    path: string;
    state: number;
    constructor(graph: Graph, path: string, state: number);
    get value(): IValue | undefined;
    get node(): Node | Edge | undefined;
    getValue(): IValue | undefined;
    getNode(): Node | Edge | undefined;
    isEmpty(): boolean;
    toJSON(): IRefJSON;
}
export declare class GraphRef {
    private graph;
    private parent;
    private key;
    static fromPath(graph: Graph, path?: string): GraphRef | null;
    constructor(graph: Graph, parent: GraphRef | null, key: string);
    set(value: ISetValue): this;
    get(key: string): GraphRef;
    getValue(): IValue | undefined;
    getNode(): Node | Edge | undefined;
    on(callback: (value: IValue | undefined) => void): () => void;
    getPath(): string;
    getChildPath(key: string): string;
}
export interface IGraphJSON {
    [key: string]: INodeJSON | IEdgeJSON | IRefJSON;
}
export interface IGraphEvents {
    get(this: Graph, path: string): void;
    set(this: Graph, json: IGraphJSON): void;
}
export declare class Graph extends EventEmitter<IGraphEvents> {
    protected entries: Map<string, Node | Edge>;
    protected state: number;
    protected invalidStates: Array<[
        path: string,
        json: INodeJSON | IEdgeJSON | IRefJSON
    ]>;
    protected invalidStateTimeoutId: unknown | undefined;
    protected lastMaxInvalidState: number;
    getEntries(): ReadonlyMap<string, Edge | Node>;
    get(key: string): GraphRef;
    getPathValue(path: string, emit?: boolean): IValue | undefined;
    getPathNode(path: string): Node | Edge | undefined;
    setAtPath(path: string, value: ISetValue): this;
    merge(json: IGraphJSON, emit?: boolean): this;
    toJSON(): IGraphJSON;
    private mergeInternal;
    private handleInvalidStates;
    private deleteInternal;
    private setInternal;
    private getOrCreateNode;
    private getOrCreateEdge;
}
export declare function getParentPath(path: string): string | undefined;
export declare function getParentPathAndKey(path: string): [parentPath: string | undefined, key: string];
export declare function getNodeValue(node: Node | Edge | undefined): IValue | undefined;
export declare function toGraphJSON(node: Node | Edge): IGraphJSON;
export {};
