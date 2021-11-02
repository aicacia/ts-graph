"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toGraphJSON = exports.getNodeValue = exports.getParentPathAndKey = exports.getParentPath = exports.Graph = exports.GraphRef = exports.SEPERATOR = void 0;
const eventemitter3_1 = require("eventemitter3");
exports.SEPERATOR = "/";
class Entry {
    constructor(graph, parent, key, state) {
        this.graph = graph;
        this.parent = parent;
        this.key = key;
        this.state = state;
    }
    getPath() {
        if (this.parent) {
            return this.parent.getPath() + exports.SEPERATOR + this.key;
        }
        else {
            return this.key;
        }
    }
    getChildPath(key) {
        return this.getPath() + exports.SEPERATOR + key;
    }
}
class Edge extends Entry {
    constructor(graph, parent, key, value, state) {
        super(graph, parent, key, state);
        this.value = value;
    }
    isEmpty() {
        return (this.value == null || (this.value instanceof Ref && this.value.isEmpty()));
    }
    toJSON() {
        return this.value instanceof Ref
            ? this.value.toJSON()
            : { value: this.value, state: this.state };
    }
    toGraphJSON(json = {}) {
        return toGraphJSONInternal(this, json);
    }
}
class Node extends Entry {
    constructor() {
        super(...arguments);
        this.children = new Map();
    }
    isEmpty() {
        return (this.children.size === 0 ||
            Array.from(this.children.values()).every((child) => child.isEmpty()));
    }
    toJSON() {
        return { state: this.state };
    }
    toGraphJSON(json = {}) {
        return toGraphJSONInternal(this, json);
    }
}
class Ref {
    constructor(graph, path, state) {
        this.graph = graph;
        this.path = path;
        this.state = state;
    }
    get value() {
        return this.getValue();
    }
    get node() {
        return this.getNode();
    }
    getValue() {
        return this.graph.getPathValue(this.path);
    }
    getNode() {
        return this.graph.getPathNode(this.path);
    }
    isEmpty() {
        const node = this.getNode();
        return node ? node.isEmpty() : true;
    }
    toJSON() {
        return { id: this.path, state: this.state };
    }
}
class GraphRef {
    constructor(graph, parent, key) {
        this.graph = graph;
        this.parent = parent;
        this.key = key;
    }
    static fromPath(graph, path = "") {
        return path
            .split(exports.SEPERATOR)
            .reduce((parent, part) => new GraphRef(graph, parent, part), null);
    }
    set(value) {
        this.graph.setAtPath(this.getPath(), value);
        return this;
    }
    get(key) {
        return new GraphRef(this.graph, this, key);
    }
    getValue() {
        return this.graph.getPathValue(this.getPath());
    }
    getNode() {
        return this.graph.getPathNode(this.getPath());
    }
    on(callback) {
        const onChange = (json) => {
            const node = this.getNode();
            if (node) {
                if (Object.keys(json).some((key) => key.startsWith(node.getPath()))) {
                    callback(getPathValue(node.graph, node, node.getPath()));
                }
            }
        };
        this.graph.on("change", onChange);
        const currentValue = this.getValue();
        if (currentValue) {
            callback(currentValue);
        }
        return () => {
            this.graph.off("change", onChange);
        };
    }
    once(callback) {
        const currentValue = this.getValue();
        if (currentValue) {
            callback(currentValue);
        }
        else {
            const onChange = (json) => {
                const node = this.getNode();
                if (node) {
                    if (Object.keys(json).some((key) => key.startsWith(node.getPath()))) {
                        this.graph.off("change", onChange);
                        callback(getPathValue(node.graph, node, node.getPath()));
                    }
                }
            };
            this.graph.on("change", onChange);
        }
    }
    getPath() {
        if (this.parent) {
            return this.parent.getPath() + exports.SEPERATOR + this.key;
        }
        else {
            return this.key;
        }
    }
    getChildPath(key) {
        return this.getPath() + exports.SEPERATOR + key;
    }
}
exports.GraphRef = GraphRef;
class Graph extends eventemitter3_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.entries = new Map();
        this.state = Date.now();
        this.invalidStates = [];
        this.lastMaxInvalidState = Infinity;
    }
    getEntries() {
        return this.entries;
    }
    get(key) {
        return new GraphRef(this, null, key);
    }
    getPathValue(path, emit = true) {
        return getPathValue(this, getPathNode(this, path), path, emit);
    }
    getPathNode(path) {
        return getPathNode(this, path);
    }
    setAtPath(path, value) {
        this.state = Date.now();
        const node = this.setInternal(path, value, this.state), json = node.toGraphJSON();
        this.emit("set", json);
        this.emit("change", json);
        return this;
    }
    merge(json) {
        const maxState = Date.now(), prevInvalidStates = this.invalidStates.length, merged = {};
        let maxInvalidState = maxState, wasMerged = false;
        for (const [key, value] of Object.entries(json)) {
            if (value.state <= maxState) {
                this.mergeInternal(key, value);
                merged[key] = value;
                wasMerged = true;
            }
            else {
                const index = this.invalidStates.findIndex(([_, j]) => value.state < j.state);
                maxInvalidState = Math.max(maxInvalidState, value.state);
                if (index === -1) {
                    this.invalidStates.push([key, value]);
                }
                else {
                    this.invalidStates.splice(index, 0, [key, value]);
                }
            }
        }
        if (prevInvalidStates !== this.invalidStates.length) {
            this.handleInvalidStates(maxState, maxInvalidState);
        }
        if (wasMerged) {
            this.state = maxState;
            this.emit("change", merged);
        }
        return this;
    }
    toJSON() {
        return Array.from(this.entries.values()).reduce((json, node) => node.toGraphJSON(json), {});
    }
    mergeInternal(path, json) {
        const jsonState = json.state, node = this.getPathNode(path);
        if (!("value" in json) && !("id" in json)) {
            if (!node || node instanceof Edge) {
                if (node) {
                    this.deleteInternal(path);
                }
                this.getOrCreateNode(path, jsonState);
            }
        }
        else {
            const jsonValue = "value" in json ? json.value : new Ref(this, json.id, jsonState);
            if (node instanceof Edge) {
                if (shouldOverwrite(node.value, node.state, jsonValue, jsonState)) {
                    node.value = jsonValue;
                    node.state = jsonState;
                }
            }
            else if (node instanceof Node) {
                if (shouldOverwrite(new Ref(this, node.getPath(), jsonState), node.state, jsonValue, jsonState)) {
                    this.deleteInternal(path);
                    this.getOrCreateEdge(path, jsonState).value = jsonValue;
                }
            }
            else {
                this.getOrCreateEdge(path, jsonState).value = jsonValue;
            }
        }
    }
    handleInvalidStates(maxState, maxInvalidState) {
        if (maxInvalidState < this.lastMaxInvalidState) {
            this.lastMaxInvalidState = maxInvalidState;
            clearTimeout(this.invalidStateTimeoutId);
            this.invalidStateTimeoutId = undefined;
        }
        if (this.invalidStateTimeoutId) {
            return;
        }
        this.invalidStateTimeoutId = setTimeout(() => {
            const newMaxState = Date.now(), invalidStates = this.invalidStates, graphJSON = {};
            this.invalidStateTimeoutId = undefined;
            let index = -1;
            for (let i = invalidStates.length - 1; i >= 0; i--) {
                const [path, json] = invalidStates[i];
                if (json.state <= newMaxState) {
                    this.mergeInternal(path, json);
                    graphJSON[path] = json;
                    index = i;
                }
            }
            if (index !== -1) {
                invalidStates.splice(index, invalidStates.length - index);
                this.state = newMaxState;
                this.emit("change", graphJSON);
            }
            if (invalidStates.length) {
                this.handleInvalidStates(newMaxState, invalidStates[0][1].state);
            }
        }, maxInvalidState - maxState);
    }
    deleteInternal(path) {
        const node = this.getPathNode(path);
        if (node instanceof Node) {
            for (const key of node.children.keys()) {
                this.deleteInternal(node.getChildPath(key));
            }
        }
        if (node) {
            this.entries.delete(node.getPath());
        }
    }
    setInternal(path, value, state) {
        let node = this.getPathNode(path);
        if (value != null && typeof value === "object") {
            if (value instanceof GraphRef) {
                if (node instanceof Node || !node) {
                    if (node) {
                        this.deleteInternal(node.getPath());
                    }
                    node = this.getOrCreateEdge(path, state);
                }
                node.value = new Ref(this, value.getPath(), state);
                node.state = state;
                return node;
            }
            else {
                if (node instanceof Edge || !node) {
                    if (node) {
                        this.deleteInternal(node.getPath());
                    }
                    node = this.getOrCreateNode(path, state);
                }
                for (const [k, v] of Object.entries(value)) {
                    node.children.set(k, this.setInternal(node.getChildPath(k), v, state));
                }
                return node;
            }
        }
        else {
            if (node instanceof Node || !node) {
                if (node) {
                    this.deleteInternal(node.getPath());
                }
                node = this.getOrCreateEdge(path, state);
            }
            node.value = value;
            node.state = state;
            return node;
        }
    }
    getOrCreateNode(path, state) {
        const keys = path.split(exports.SEPERATOR), key = keys.shift();
        let parent = this.entries.get(key);
        if (!(parent instanceof Node)) {
            parent = new Node(this, null, key, this.state);
            this.entries.set(key, parent);
        }
        return keys.reduce((parent, key) => {
            const node = parent.children.get(key);
            if (node instanceof Node) {
                return node;
            }
            else if (node instanceof Edge) {
                if (node.value instanceof Ref) {
                    const refNode = node.value.getNode();
                    if (refNode instanceof Node) {
                        return refNode;
                    }
                }
            }
            const newNode = new Node(this, parent, key, state);
            parent.children.set(key, newNode);
            this.entries.set(newNode.getPath(), newNode);
            return newNode;
        }, parent);
    }
    getOrCreateEdge(path, state) {
        const [parentPath, key] = getParentPathAndKey(path), parent = parentPath ? this.getOrCreateNode(parentPath, state) : null;
        let node = parent === null || parent === void 0 ? void 0 : parent.children.get(key);
        if (node instanceof Edge) {
            return node;
        }
        else {
            node = new Edge(this, parent, key, null, state);
            parent === null || parent === void 0 ? void 0 : parent.children.set(key, node);
            this.entries.set(path, node);
            return node;
        }
    }
}
exports.Graph = Graph;
function getParentPath(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return undefined;
    }
    else {
        return path.substring(index + 1);
    }
}
exports.getParentPath = getParentPath;
function getParentPathAndKey(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return [undefined, path];
    }
    else {
        return [path.substring(0, index), path.substring(index + 1)];
    }
}
exports.getParentPathAndKey = getParentPathAndKey;
function getNodeValue(node) {
    return getNodeValueInternal(node, new Map());
}
exports.getNodeValue = getNodeValue;
function getNodeValueInternal(node, values) {
    if (!node) {
        return undefined;
    }
    const seen = values.get(node);
    if (seen) {
        return seen;
    }
    if (node instanceof Edge) {
        if (node.value instanceof Ref) {
            const value = getNodeValueInternal(node.value.getNode(), values) || null;
            values.set(node, value);
            return value;
        }
        else {
            const value = node.value;
            values.set(node, value);
            return value;
        }
    }
    else if (node instanceof Node) {
        const children = {};
        values.set(node, children);
        for (const key of node.children.keys()) {
            children[key] =
                getNodeValueInternal(node.children.get(key), values) || null;
        }
        return children;
    }
    values.set(node, undefined);
    return undefined;
}
function toGraphJSON(node) {
    return toGraphJSONInternal(node, {});
}
exports.toGraphJSON = toGraphJSON;
function toGraphJSONInternal(node, json) {
    json[node.getPath()] = node.toJSON();
    if (node instanceof Node) {
        for (const child of node.children.values()) {
            toGraphJSONInternal(child, json);
        }
    }
    return json;
}
function getPathValue(graph, node, path, emit = true) {
    let value;
    if (node) {
        value = getNodeValue(node);
        path = node.getPath();
    }
    if (emit) {
        graph.emit("get", path);
    }
    return value;
}
function getPathNode(graph, path) {
    const keys = path.split(exports.SEPERATOR), key = keys.shift(), node = graph.getEntries().get(key);
    if (node) {
        return followNodePath(keys, node);
    }
    else {
        return undefined;
    }
}
function followNodePath(keys, node) {
    if (keys.length === 0) {
        return node;
    }
    else if (node instanceof Node) {
        const key = keys.shift(), child = node.children.get(key);
        if (child) {
            return followNodePath(keys, child);
        }
    }
    else if (node.value instanceof Ref) {
        const refNode = node.value.getNode();
        if (refNode) {
            return followNodePath(keys, refNode);
        }
    }
    return undefined;
}
function shouldOverwrite(localValue, localState, remoteValue, remoteState) {
    return (remoteState >= localState &&
        (localState === remoteState
            ? JSON.stringify(remoteValue) > JSON.stringify(localValue)
            : true));
}
