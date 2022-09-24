import { Entry } from "./Entry";
export class Node extends Entry {
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
