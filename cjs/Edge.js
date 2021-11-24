"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Edge = void 0;
const Ref_1 = require("./Ref");
const Entry_1 = require("./Entry");
class Edge extends Entry_1.Entry {
    constructor(graph, parent, key, state, value) {
        super(graph, parent, key, state);
        this.value = value;
    }
    getPath() {
        return this.value instanceof Ref_1.Ref ? this.value.getPath() : super.getPath();
    }
    toJSON() {
        return this.value instanceof Ref_1.Ref
            ? this.value.toJSON()
            : Object.assign(Object.assign({}, super.toJSON()), { value: this.value });
    }
}
exports.Edge = Edge;
