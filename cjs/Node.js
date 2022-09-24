"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Node = void 0;
const Entry_1 = require("./Entry");
class Node extends Entry_1.Entry {
    constructor() {
        super(...arguments);
        this.children = {};
    }
    toJSON() {
        return Object.assign(Object.assign({}, super.toJSON()), { children: Object.entries(this.children).reduce((children, [key, child]) => {
                if (child instanceof Node) {
                    children[key] = { state: child.state, id: child.getPath() };
                }
                else {
                    children[key] = child.toJSON();
                }
                return children;
            }, {}) });
    }
}
exports.Node = Node;
