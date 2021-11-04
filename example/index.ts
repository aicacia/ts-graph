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
      mesh.broadcast({
        path,
        json,
      });
    })
    .on("change", () => {
      document.getElementById("json").innerHTML = JSON.stringify(
        graph,
        null,
        2
      );
    })
    .on("get", (path) => {
      mesh.broadcast({
        path,
      });
    });

  mesh.on("data", (data: IMessage) => {
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
    .on((users) => {
      console.log(users);
    });

  /*
  graph.get("rooms").get('r1').set({
    users: {
      u1: {
        name: 'Nathan'
      }
    }
  });
  graph.get('rooms').get('r1').get('users').get('u2').set({name: "Billy"})
  */
}

window.addEventListener("load", onLoad);
