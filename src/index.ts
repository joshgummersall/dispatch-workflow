import { Octokit } from "@octokit/rest";
import { Toolkit } from "actions-toolkit";

type Inputs = {
  inputs?: string;
  ref?: string;
  repo?: string;
  token: string;
  workflow: string;
};

Toolkit.run<Inputs>(async (tools) => {
  const { inputs: maybeInputString, ref: maybeRef, token } = tools.inputs;
  const workflowQuery = tools.inputs.workflow.trim();

  const ref = maybeRef?.trim() ?? "main";

  let { owner, repo } = tools.context.repo;
  if (tools.inputs.repo) {
    [owner, repo] = tools.inputs.repo.split("/");
  }

  let inputs = {};
  if (maybeInputString) {
    inputs = JSON.parse(maybeInputString);
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
