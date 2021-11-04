import SimplePeer from "simple-peer";
import { Mesh, Peer } from "@aicacia/mesh";
import { Graph } from "../src";
import { IRefJSON, IEdgeJSON, INodeJSON } from "../src/Graph";

declare global {
  interface Window {
    peer: Peer;
    mesh: Mesh;
    graph: Graph;
  }
}

type IMessage =
  | {
      path: string;
      json: IRefJSON | IEdgeJSON | INodeJSON;
    }
  | {
      path: string;
    };

async function onLoad() {
  const peer = new Peer(SimplePeer, {
      namespace: "example-graph",
    }),
    mesh = new Mesh(peer),
    graph = new Graph();

  window.graph = graph;
  window.graph = graph;
  window.graph = graph;

  graph
    .on("set", (path, json) => {
      console.log("sending set", path, json);
      mesh.broadcast({
        path,
        json,
      });
    })
    .on("change", (path, json) => {
      console.log("sending change", path, json);
    })
    .on("get", (path) => {
      console.log("sending get", path);
      mesh.broadcast({
        path,
      });
    });

  mesh.on("data", (data: IMessage) => {
    console.log("receiving", data);

    if ("json" in data) {
      graph.merge(data.path, data.json);
    } else {
      const node = graph.getNodeAtPath(data.path);

      if (node) {
        mesh.broadcast({
          type: "set",
          path: data.path,
          json: node.toJSON(),
        });
      }
    }
  });

  await peer.connected();

  graph
    .get("rooms")
    .get("r1")
    .get("users")
    .on(() => {
      document.getElementById("json").innerHTML = JSON.stringify(
        graph,
        null,
        2
      );
    });

  document.getElementById("name").addEventListener("input", (e) => {
    graph
      .get("rooms")
      .get("r1")
      .get("users")
      .get(peer.getId())
      .get("name")
      .set((e.currentTarget as HTMLInputElement).value);
  });
}

window.addEventListener("load", onLoad);
