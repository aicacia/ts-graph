import type { Graph } from "./Graph";
import type { IEntryJSON } from "./Entry";
import { IRefJSON, Ref } from "./Ref";
import { Entry } from "./Entry";
import type { IPrimitive } from "./types";
export interface IEdgeJSON extends IEntryJSON {
    value: IPrimitive;
}
export declare class Edge extends Entry {
    value: IPrimitive | Ref;
    constructor(graph: Graph, parent: Entry | null, key: string, state: number, value: IPrimitive);
    getPath(): string;
    toJSON(): IEdgeJSON | IRefJSON;
}
