"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github_1 = require("@actions/github");
const path = require("path");
const github_service_1 = require("./github.service");
const ngupdate_service_1 = require("./ngupdate.service");
const git_service_1 = require("./git.service");
const helpers_1 = require("./helpers");
void (async () => {
    try {
        const repo = `${github_1.context.repo.owner}/${github_1.context.repo.repo}`;
        const repoToken = core.getInput('repo-token');
        const baseBranch = core.getInput('base-branch');
        const remoteUrl = `https://x-access-token:${repoToken}@github.com/${repo}`;
        const repoDir = process.env.GITHUB_WORKSPACE || ''; // TODO: if empty, manually checkout project
        const authorName = 'ng-update[bot]';
        const authorEmail = 'ng-update@users.noreply.github.com';
        const projectPath = path.normalize(path.join(repoDir, core.getInput('project-path')));
        const nodeModulesPath = path.normalize(path.join(repoDir, core.getInput('node-modules-path') || core.getInput('project-path')));
        const gbClient = (0, github_1.getOctokit)(repoToken);
        const ngService = new ngupdate_service_1.NgUpdateService(projectPath, nodeModulesPath);
        const gitService = new git_service_1.GitService(repoDir);
        const gbService = new github_service_1.GithubService(gbClient, github_1.context);
        core.info('🤖 Checking if received Github event should be ignored...');
        if (gbService.shouldIgnoreEvent(baseBranch)) {
            return;
        }
        if (helpers_1.Helpers.isFolderEmpty(repoDir)) {
            const fetchDepth = core.getInput('fetch-depth');
            core.info(`🤖 Repo directory at: '${repoDir}' is empty. Checking out from: '${remoteUrl}'...`);
            await gitService.clone(remoteUrl, fetchDepth);
        }
        await core.group(`🤖 Initializing git config at: '${repoDir}'`, async () => {
            await gitService.init(remoteUrl, authorName, authorEmail);
        });
        await core.group(`🤖 Moving git head to base branch: ${baseBranch}`, async () => {
            await gitService.checkoutBranch(baseBranch);
        });
        const ngFilePath = path.join(projectPath, 'angular.json');
        const isNgProject = await helpers_1.Helpers.isFileExists(ngFilePath);
        if (!isNgProject) {
            core.error(`🤖 Could not detect an Angular CLI project under "${projectPath}", exiting`);
            return;
        }
        const prTitle = core.getInput('pr-title');
        const prBranchPrefix = core.getInput('pr-branch-prefix');
        let prBranch = '';
        await core.group('🤖 Prerequisites are done. Trying to "ng update" your code now...', async () => {
            const ngUpdateResult = await ngService.runUpdate();
            if (ngUpdateResult.packages.length > 0 && await gitService.hasChanges()) {
                const prBody = helpers_1.Helpers.getPrBody(core.getInput('pr-body'), ngUpdateResult.ngUpdateOutput);
                const prLabels = helpers_1.Helpers.getPrAssignees(core.getInput('pr-labels'));
                const prAssignees = helpers_1.Helpers.getPrAssignees(core.getInput('pr-assignees'));
                const prReviewers = helpers_1.Helpers.getPrReviewers(core.getInput('pr-reviewers'));
                const ngUpdateSha1 = await gitService.shortenSha1(helpers_1.Helpers.computeSha1(ngUpdateResult));
                prBranch = `${prBranchPrefix.substring(0, prBranchPrefix.lastIndexOf('-'))}-${ngUpdateSha1}`;
                core.info(`🤖 PR branch will be: ${prBranch}`);
                const remotePrBranchExists = await gitService.remoteBranchExists(prBranch);
                await core.group(`🤖 Moving git head to pr branch: ${prBranch}`, async () => {
                    await gitService.cleanCheckoutBranch(prBranch, baseBranch, remotePrBranchExists);
                });
                await core.group(`🤖 Committing changes to branch: ${prBranch}`, async () => {
                    await gitService.commit(prTitle);
                });
                await core.group(`🤖 Pushing changes to pr branch: ${prBranch}`, async () => {
                    await gitService.push(prBranch, remotePrBranchExists); // will updated existing pr
                });
                let prNumber = await gbService.getOpenPR(baseBranch, prBranch);
                if (prNumber) {
                    core.info(`🤖 PR from branch '${prBranch}' to '${baseBranch}' already existed (#${prNumber}). It's been simply updated.`);
                }
                else {
                    await core.group(`🤖 Creating PR from branch '${prBranch}' to '${baseBranch}'`, async () => {
                        prNumber = await gbService.createPR(baseBranch, prBranch, prTitle, prBody, prAssignees, prReviewers, prLabels);
                    });
                }
                if (prNumber) {
                    core.setOutput('pr-number', `'${prNumber}'`);
                }
            }
            else {
                core.info('🤖 Running "ng update" has produced no change in your code, you must be up-to-date already 👏!');
            }
            core.setOutput('ng-update-result', JSON.stringify(ngUpdateResult.packages));
        });
        const deleteClosedPRBranches = core.getInput('delete-closed-pr-branches') === 'true';
        if (deleteClosedPRBranches) {
            await core.group('🤖 Deleting branches related to closed PRs created by this action...', async () => {
                await gbService.deleteClosedPRsBranches(baseBranch, prTitle, prBranchPrefix, prBranch);
            });
        }
    }
    catch (ex) {
        core.setFailed(ex.message);
    }
})();
//# sourceMappingURL=main.js.map