"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rest_1 = require("@octokit/rest");
const actions_toolkit_1 = require("actions-toolkit");
actions_toolkit_1.Toolkit.run(async (tools) => {
    var _a;
    const { inputs: maybeInputString, ref: maybeRef, token } = tools.inputs;
    const workflowQuery = tools.inputs.workflow.trim();
    const ref = (_a = maybeRef === null || maybeRef === void 0 ? void 0 : maybeRef.trim()) !== null && _a !== void 0 ? _a : "main";
    let { owner, repo } = tools.context.repo;
    if (tools.inputs.repo) {
        [owner, repo] = tools.inputs.repo.split("/");
    }
    let inputs = {};
    if (maybeInputString) {
        inputs = JSON.parse(maybeInputString);
    }
    const github = new rest_1.Octokit({
        auth: `token ${token}`,
    });
    const workflows = await github.paginate(github.actions.listRepoWorkflows.endpoint.merge({
        owner,
        repo,
    }));
    let workflow = workflows.find((workflow) => workflow.name === workflowQuery);
    if (!workflow) {
        workflow = workflows.find((workflow) => workflow.id.toString() === workflowQuery);
        if (!workflow) {
            throw new Error(`unable to find workflow "${workflowQuery}" by name or ID`);
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
