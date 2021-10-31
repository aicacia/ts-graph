import tape from "tape";
import { Graph } from "./Graph";

tape("Graph", (assert: tape.Test) => {
  const graph = new Graph();

  graph.get("nathan").set({
    name: "Nathan",
    children: {
      billy: graph.get("billy").set({
        name: "Billy",
        parent: graph.get("nathan"),
        parentName: graph.get("nathan").get("name"),
      }),
    },
  });

  assert.equal(graph.get("billy").get("name").getValue(), "Billy");
  assert.equal(
    graph
      .get("nathan")
      .get("children")
      .get("billy")
      .get("parent")
      .get("name")
      .getValue(),
    "Nathan"
  );
  assert.equal(
    graph
      .get("nathan")
      .get("children")
      .get("billy")
      .get("parentName")
      .getValue(),
    "Nathan"
  );

  assert.end();
});
