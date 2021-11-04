import { EventEmitter } from "eventemitter3";
export declare type IPrimitive = string | number | boolean | null;
export declare type ISetValue = Ref | IPrimitive | {
    [key: string | symbol | number]: ISetValue;
};
export declare type IGetValue = IPrimitive | Ref | {
    [key: string | symbol | number]: IGetValue;
};
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
    toNodesJSON(): {
        [key: string]: INodeJSON | IEdgeJSON | IRefJSON;
        [key: number]: INodeJSON | IEdgeJSON | IRefJSON;
        [key: symbol]: INodeJSON | IEdgeJSON | IRefJSON;
    };
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
export declare class Ref {
    protected graph: Graph;
    protected path: string;
    protected state: number;
    constructor(graph: Graph, path: string, state: number);
    get(key: string): Ref;
    set(value: ISetValue): Graph;
    getValue(): IGetValue | undefined;
    getPath(): string;
    getNode(): Node | Edge | undefined;
    getState(): number;
    on(callback: (value: IGetValue | undefined) => void): () => void;
    toJSON(): IRefJSON;
}
export interface IGraphEvents {
    get(this: Graph, path: string): void;
    set(this: Graph, path: string, value: IRefJSON | IEdgeJSON): void;
    change(this: Graph, path: string, value: IRefJSON | IEdgeJSON | INodeJSON): void;
}
export declare class Graph extends EventEmitter<IGraphEvents> {
    protected state: number;
    protected entries: Map<string, Node | Edge>;
    getEntries(): ReadonlyMap<string, Node | Edge>;
    get(path: string): Ref;
    getValueAtPath(path: string): IGetValue | undefined;
    getNodeAtPath(path: string): Node | Edge | undefined;
    set(path: string, value: ISetValue): this;
    merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON): this;
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
