import { Ref } from "./Ref";
import { Entry } from "./Entry";
export class Edge extends Entry {
    value;
    constructor(graph, parent, key, state, value) {
        super(graph, parent, key, state);
        this.value = value;
    }
    getPath() {
        return this.value instanceof Ref ? this.value.getPath() : super.getPath();
    }
    toJSON() {
        return this.value instanceof Ref
            ? this.value.toJSON()
            : {
                ...super.toJSON(),
                value: this.value,
            };
    }
}
