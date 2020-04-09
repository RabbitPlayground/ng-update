import gitP, { SimpleGit } from 'simple-git/promise';


export class GitService {

  private git: SimpleGit;

  public constructor(private repoDir: string) {
    this.git = gitP(repoDir);
  }

  public async clone(repoUrl: string, depth?: string): Promise<void> {
    await this.git.clone(repoUrl, this.repoDir, { ...(depth && { '--depth': depth }) });
  }

  public async init(remoteUrl: string, authorName: string, authorEmail: string): Promise<void> {
    await this.git.addConfig('user.name', authorName);
    await this.git.addConfig('user.email', authorEmail);
    await this.git.remote(['set-url', 'origin', remoteUrl]);
  }


  public async hasChanges(): Promise<boolean> {
    const status = await this.git.status();
    return !status.isClean();
  }

  public async remoteBranchExists(branch: string): Promise<boolean> {
    const remotes = await this.git.branch(['-r']);
    return remotes.all.includes(`origin/${branch}`);
  }

  public async checkoutBranch(branch: string): Promise<void> {
    await this.git.checkout(branch);
  }

  public async cleanCheckoutBranch(branch: string, baseBranch: string, remoteExists: boolean): Promise<void> {
    if (remoteExists) {
      await this.git.stash(['--include-untracked']);
      await this.git.checkout(branch);
      await this.git.reset(['--hard', `origin/${baseBranch}`]);
      try {
        await this.git.stash(['pop']);
      } catch (e) {
        console.error(`error when unstashing: ${e.message}`);
        await this.git.checkout(['--theirs', '.']);
        await this.git.reset();
      }
    }
    else {
      await this.git.checkoutBranch(branch, `origin/${baseBranch}`);
    }
  }

  public async raw(commands: string | string[]): Promise<string> {
    return this.git.raw(commands);
  }

  public async shortenSha1(sha1: string): Promise<string> {
    return this.git.revparse(['--short', sha1]);
  }

  public async commit(message: string): Promise<void> {
    await this.git.add("./*");
    await this.git.commit(message);
  }

  public async push(branch: string, force?: boolean): Promise<void> {
    await this.git.push('origin', branch, { '--set-upstream': null, ...(force && { '--force': null }) });
  }
}