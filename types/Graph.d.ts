import { EventEmitter } from "eventemitter3";
import type { IEdgeJSON } from "./Edge";
import { Edge } from "./Edge";
import type { IEntryJSON } from "./Entry";
import type { INodeJSON } from "./Node";
import { Node } from "./Node";
import type { IRefJSON } from "./Ref";
import { Ref } from "./Ref";
import type { IGraph, IGraphValue, IKeyOf, IRefValue, IPrimitive } from "./types";
export interface IDeleteJSON extends IEntryJSON {
    delete: true;
}
export interface IGraphEvents<T extends IGraph> {
    get(this: Graph<T>, path: string): void;
    set(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON): void;
    change(this: Graph<T>, path: string, value: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON): void;
}
export interface IGraphJSON extends IEntryJSON {
    entries: {
        [key: string]: IEdgeJSON | INodeJSON | IPrimitive;
    };
}
export declare class Graph<T extends IGraph = IGraph> extends EventEmitter<IGraphEvents<T>> {
    protected state: number;
    protected entries: {
        [key: string]: Node | Edge;
    };
    protected listeningPaths: Set<string>;
    protected waitMS: number;
    setWaitMS(waitMS: number): this;
    getWaitMS(): number;
    getEntries(): {
        [key: string]: Node | Edge;
    };
    getState(): number;
    get<K extends IKeyOf<T> = IKeyOf<T>>(key: K): Ref<T[K]>;
    getValueAtPath<V extends IGraphValue = IGraphValue>(path: string): IRefValue<V> | undefined;
    getNodeAtPath(path: string): Node | Edge | undefined;
    set(path: string, value: IGraphValue): this;
    delete(path: string): this;
    merge(path: string, json: IRefJSON | IEdgeJSON | INodeJSON | IDeleteJSON): this;
    listenAtPath(path: string, emit?: boolean): this;
    isListening(path: string): boolean;
    toJSON(): IGraphJSON;
    private mergePathInternal;
    private mergePathEdgeInternal;
    private mergeDeletePathInternal;
    private mergeDeletePathEdgeInternal;
    private setPathInternal;
    private setEdgePathInternal;
    private createNodeAt;
    private createEdgeAt;
    private deletePathInternal;
}
export declare function getParentPathAndKey(path: string): [parentPath: string | undefined, key: string];
