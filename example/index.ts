import SimplePeer from "simple-peer";
import { Mesh, Peer } from "@aicacia/mesh";
import { Graph } from "../src";
import { IGraphJSON } from "../src/Graph";

declare global {
  interface Window {
    peer: Peer;
    mesh: Mesh;
    graph: Graph;
  }
}

type IMessage =
  | {
      type: "set";
      json: IGraphJSON;
    }
  | {
      type: "get";
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
    .on("set", (json) => {
      console.log("request set", json);
      mesh.broadcast({
        type: "set",
        json,
      });
    })
    .on("get", (path) => {
      console.log("request get", path);
      mesh.broadcast({
        type: "get",
        path,
      });
    });

  mesh.on("data", (data: IMessage) => {
    console.log(data);
    if (data.type === "set") {
      console.log("reveived set", data.json);
      graph.merge(data.json);
    } else if (data.type === "get") {
      console.log("reveived get", data.path);
      const node = graph.getPathNode(data.path);

      console.log(node);

      if (node) {
        mesh.broadcast({
          type: "set",
          json: node.toGraphJSON(),
        });
      }
    }
  });

  await peer.connected();

  graph
    .get("rooms")
    .get("r1")
    .get("users")
    .on((users: any) => {
      document.getElementById("json").innerText = JSON.stringify(
        users,
        null,
        2
      );
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
