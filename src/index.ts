import { Octokit } from "@octokit/rest";
import { Toolkit } from "actions-toolkit";

type Inputs = {
  encoded?: string;
  inputs?: string;
  ref?: string;
  repo?: string;
  token: string;
  workflow: string;
};

Toolkit.run<Inputs>(async (tools) => {
  const {
    encoded: maybeEncoded,
    inputs: maybeInputString,
    ref: maybeRef,
    token,
  } = tools.inputs;

  const encoded = maybeEncoded ? JSON.parse(maybeEncoded) : false;

  const workflowQuery = tools.inputs.workflow.trim();

  const ref = maybeRef?.trim() ?? "main";

  let { owner, repo } = tools.context.repo;
  if (tools.inputs.repo) {
    [owner, repo] = tools.inputs.repo.split("/");
  }

  let inputs = {};
  if (maybeInputString) {
    inputs = JSON.parse(maybeInputString);

    if (encoded) {
      inputs = Object.entries(inputs).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]:
            typeof value === "string"
              ? Buffer.from(value, "base64").toString("utf8")
              : value,
        }),
        {}
      );
    }
  }

  const github = new Octokit({
    auth: `token ${token}`,
  });

  const workflows: Array<{ id: number; name: string }> = await github.paginate(
    github.actions.listRepoWorkflows.endpoint.merge({
      owner,
      repo,
    })
  );

  let workflow = workflows.find((workflow) => workflow.name === workflowQuery);
  if (!workflow) {
    workflow = workflows.find(
      (workflow) => workflow.id.toString() === workflowQuery
    );

    if (!workflow) {
      throw new Error(
        `unable to find workflow "${workflowQuery}" by name or ID`
      );
    }
  }

  await github.actions.createWorkflowDispatch({
    inputs,
    owner,
    ref,
    repo,
    workflow_id: workflow.id,
  });
});
