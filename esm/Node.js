import { Entry } from "./Entry";
export class Node extends Entry {
    children = new Map();
    toJSON() {
        const children = {};
        for (const [key, child] of this.children) {
            if (child instanceof Node) {
                children[key] = { state: child.state, id: child.getPath() };
            }
            else {
                children[key] = child.toJSON();
            }
        }
        return {
            ...super.toJSON(),
            children,
        };
    }
}
