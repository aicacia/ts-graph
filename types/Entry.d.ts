import type { Graph } from "./Graph";
export interface IEntryJSON {
    state: number;
}
export declare class Entry {
    graph: Graph;
    parent: Entry | null;
    key: string;
    state: number;
    constructor(graph: Graph, parent: Entry | null, key: string, state: number);
    getValue(): string | number | boolean | import("./Ref").Ref<import("./types").IGraphValue> | import("./types").IGraph | {
        [x: string]: import("./types").IPrimitive | import("./Ref").Ref<import("./types").IGraphValue> | import("./Ref").Ref<import("./types").IGraph>;
    } | null | undefined;
    getPath(): string;
    toJSON(): IEntryJSON;
}
