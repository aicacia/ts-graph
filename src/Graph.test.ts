import tape from "tape";
import { Graph, Ref } from "./Graph";

type IBilly = {
  name: string;
  parent: Ref<INathan>;
  parentName: Ref<string>;
};

type INathan = {
  name: string;
  children: {
    billy: Ref<IBilly>;
  };
};

tape("Graph", (assert: tape.Test) => {
  const graph = new Graph<{
    nathan: INathan;
    billy: IBilly;
  }>();

  graph.get("nathan").set({
    name: "Nathan",
    children: {
      billy: graph.get("billy").set({
        name: "Billy",
        parent: graph.get("nathan"),
        parentName: graph.get("nathan").get("name") as Ref<string>,
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
