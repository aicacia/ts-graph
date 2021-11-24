import { EventEmitter } from "eventemitter3";
import { Edge } from "./Edge";
import { Node } from "./Node";
import { Ref } from "./Ref";
import { SEPERATOR } from "./types";
export class Graph extends EventEmitter {
    state = Date.now();
    entries = new Map();
    listeningPaths = new Set();
    waitMS = 5000;
    setWaitMS(waitMS) {
        this.waitMS = waitMS;
        return this;
    }
    getWaitMS() {
        return this.waitMS;
    }
    getEntries() {
        return this.entries;
    }
    get(key) {
        return new Ref(this, key, this.state);
    }
    getValueAtPath(path) {
        const node = this.getNodeAtPath(path);
        let value;
        if (node) {
            value = getValueAtNode(this, node);
            if (value === undefined) {
                this.listenAtPath(path);
            }
        }
        else {
            this.listenAtPath(path);
        }
        return value;
    }
    getNodeAtPath(path) {
        return getNodeAtPath(this, path, new Map());
    }
    set(path, value) {
        this.state = Date.now();
        this.setPathInternal(path, value, this.state);
        return this;
    }
    merge(path, json) {
        if (this.isListening(path)) {
            const maxState = Date.now();
            if ("children" in json) {
                for (const [key, child] of Object.entries(json.children)) {
                    this.mergePathInternal(path + SEPERATOR + key, child, maxState);
                }
            }
            else {
                this.mergePathInternal(path, json, maxState);
            }
        }
        return this;
    }
    listenAtPath(path, emit = true) {
        if (emit) {
            this.emit("get", path);
        }
        this.listeningPaths.add(path);
        return this;
    }
    isListening(path) {
        for (const listeningPath of this.listeningPaths) {
            if (path.startsWith(listeningPath)) {
                return true;
            }
        }
        return false;
    }
    mergePathInternal(path, json, maxState) {
        const jsonState = json.state;
        if (jsonState > maxState) {
            setTimeout(() => this.mergePathEdgeInternal(path, json), jsonState - maxState);
        }
        else {
            this.mergePathEdgeInternal(path, json);
        }
        return this;
    }
    mergePathEdgeInternal(path, json) {
        const jsonState = json.state, node = this.getNodeAtPath(path);
        const jsonValue = "value" in json ? json.value : new Ref(this, json.id, jsonState);
        if (node instanceof Edge) {
            if (shouldOverwrite(node.value, node.state, jsonValue, jsonState)) {
                node.value = jsonValue;
                node.state = jsonState;
                this.emit("change", node.getPath(), node.toJSON());
            }
        }
        else if (node instanceof Node) {
            if (shouldOverwrite(new Ref(this, node.getPath(), jsonState), node.state, jsonValue, jsonState)) {
                const newNode = this.createEdgeAt(path, jsonState);
                newNode.value = jsonValue;
                this.emit("change", newNode.getPath(), newNode.toJSON());
            }
        }
        else {
            const newNode = this.createEdgeAt(path, jsonState);
            newNode.value = jsonValue;
            this.emit("change", newNode.getPath(), newNode.toJSON());
        }
        return this;
    }
    setPathInternal(path, value, state) {
        if (value instanceof Ref) {
            this.setEdgePathInternal(path, value, state);
        }
        else if (value !== null && typeof value === "object") {
            for (const [k, v] of Object.entries(value)) {
                this.setPathInternal(path + SEPERATOR + k, v, state);
            }
        }
        else {
            this.setEdgePathInternal(path, value, state);
        }
    }
    setEdgePathInternal(path, value, state) {
        const edge = this.createEdgeAt(path, state);
        edge.value = value;
        const edgePath = edge.getPath(), edgeJSON = edge.toJSON();
        this.emit("change", edgePath, edgeJSON);
        this.emit("set", edgePath, edgeJSON);
        return edge;
    }
    createNodeAt(path, state) {
        const keys = path.split(SEPERATOR), key = keys.shift();
        let parent = this.entries.get(key);
        if (!(parent instanceof Node)) {
            parent = new Node(this, null, key, state);
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
            return newNode;
        }, parent);
    }
    createEdgeAt(path, state) {
        const [parentPath, key] = getParentPathAndKey(path), parent = parentPath ? this.createNodeAt(parentPath, state) : null;
        let node = parent?.children.get(key);
        if (node instanceof Edge) {
            node.state = state;
            return node;
        }
        else {
            node = new Edge(this, parent, key, state, null);
            if (parent) {
                parent?.children.set(key, node);
            }
            else {
                this.entries.set(key, node);
            }
            return node;
        }
    }
}
export function getParentPathAndKey(path) {
    const index = path.lastIndexOf("/");
    if (index === -1) {
        return [undefined, path];
    }
    else {
        return [path.substring(0, index), path.substring(index + 1)];
    }
}
function getNodeAtPath(graph, path, nodes) {
    const seen = nodes.get(path);
    if (seen !== undefined) {
        return seen || undefined;
    }
    else {
        const keys = path.split(SEPERATOR), key = keys.shift(), node = graph.getEntries().get(key);
        if (node && keys.length) {
            nodes.set(key, node);
            return getNodeAtPathInternal(graph, key, node, keys, nodes);
        }
        else {
            return node;
        }
    }
}
function getNodeAtPathInternal(graph, path, node, keys, nodes = new Map()) {
    if (node instanceof Node) {
        const key = keys.shift();
        if (key) {
            const child = node.children.get(key), childPath = path + SEPERATOR + key;
            if (child) {
                nodes.set(childPath, child);
                return getNodeAtPathInternal(graph, childPath, child, keys, nodes);
            }
            else {
                nodes.set(childPath, null);
                return undefined;
            }
        }
        else {
            nodes.set(path, node);
            return node;
        }
    }
    else if (node.value instanceof Ref) {
        const refPath = node.value.getPath(), refNode = getNodeAtPath(graph, refPath, nodes);
        if (refNode && refNode !== node) {
            return getNodeAtPathInternal(graph, path, refNode, keys, nodes);
        }
        else {
            nodes.set(refPath, null);
            return undefined;
        }
    }
    else {
        nodes.set(path, node);
        return node;
    }
}
function getValueAtNode(graph, node, seen = new Set()) {
    if (!node) {
        return undefined;
    }
    else if (node instanceof Node) {
        const children = {};
        for (const [k, c] of node.children) {
            const childValue = c instanceof Edge
                ? c.value
                : (children[k] = new Ref(graph, c.getPath(), c.state));
            children[k] = childValue;
        }
        return children;
    }
    else if (node.value instanceof Ref) {
        if (seen.has(node.value.getPath())) {
            return undefined;
        }
        else {
            seen.add(node.value.getPath());
        }
        return getValueAtNode(graph, node.value.getNode(), seen);
    }
    else {
        return node.value;
    }
}
function shouldOverwrite(localValue, localState, remoteValue, remoteState) {
    return (remoteState >= localState &&
        (localState === remoteState
            ? JSON.stringify(remoteValue).length > JSON.stringify(localValue).length
            : true));
}
