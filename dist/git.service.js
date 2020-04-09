Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const promise_1 = tslib_1.__importDefault(require("simple-git/promise"));
class GitService {
    constructor(repoDir) {
        this.repoDir = repoDir;
        this.git = promise_1.default(repoDir);
    }
    async clone(repoUrl, depth) {
        await this.git.clone(repoUrl, this.repoDir, { ...(depth && { '--depth': depth }) });
    }
    async init(remoteUrl, authorName, authorEmail) {
        await this.git.addConfig('user.name', authorName);
        await this.git.addConfig('user.email', authorEmail);
        await this.git.remote(['set-url', 'origin', remoteUrl]);
    }
    async hasChanges() {
        const status = await this.git.status();
        return !status.isClean();
    }
    async remoteBranchExists(branch) {
        const remotes = await this.git.branch(['-r']);
        return remotes.all.includes(`origin/${branch}`);
    }
    async checkoutBranch(branch) {
        await this.git.checkout(branch);
    }
    async cleanCheckoutBranch(branch, baseBranch, remoteExists) {
        if (remoteExists) {
            await this.git.stash(['--include-untracked']);
            await this.git.checkout(branch);
            await this.git.reset(['--hard', `origin/${baseBranch}`]);
            try {
                await this.git.stash(['pop']);
            }
            catch (e) {
                console.error(`error when unstashing: ${e.message}`);
                await this.git.checkout(['--theirs', '.']);
                await this.git.reset();
            }
        }
        else {
            await this.git.checkoutBranch(branch, `origin/${baseBranch}`);
        }
    }
    async raw(commands) {
        return this.git.raw(commands);
    }
    async shortenSha1(sha1) {
        return this.git.revparse(['--short', sha1]);
    }
    async commit(message) {
        await this.git.add("./*");
        await this.git.commit(message);
    }
    async push(branch, force) {
        await this.git.push('origin', branch, { '--set-upstream': null, ...(force && { '--force': null }) });
    }
}
exports.GitService = GitService;
//# sourceMappingURL=git.service.js.map