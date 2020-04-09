import * as exec from '@actions/exec';
import * as path from 'path';
import * as fs from 'fs';
// tslint:disable-next-line: no-var-requires
const hash = require('object-hash');
import { exists } from '@actions/io/lib/io-util';
import { ExecOptions } from '@actions/exec/lib/interfaces';

export class Helpers {

  public static timeout(millis: number) {
    return new Promise((resolve) => setTimeout(resolve, millis));
  }

  public static async isFileExists(filePath: string): Promise<boolean> {
    return exists(filePath);
  }

  public static isFolderEmpty(folderPath: string): boolean {
    return fs.readdirSync(folderPath).length === 0;
  }

  /**
   * Makes sure that the given project as a `node_modules` folder, installs it otherwise
   * @param projectPath project path
   * @param force if true, will always install node modules (via `npm ci`) no matter if one already exits
   */
  public static async ensureNodeModules(projectPath: string, force?: boolean): Promise<void> {
    if (!force) {
      const nodeModulesPath = path.normalize(path.join(projectPath, 'node_modules'));
      const hasNodeModules = await exists(nodeModulesPath);
      if (hasNodeModules)
        return;
    }
    const options: ExecOptions = {
      cwd: projectPath
    };

    const useYarn = await Helpers.isFileExists(path.join(projectPath, 'yarn.lock'));
    await (useYarn ? exec.exec('yarn', ['install'], options) : exec.exec('npm', ['ci'], options));
  }

  public static getLocalNgExecPath(baseDir: string) {
    return path.normalize(path.join(baseDir, 'node_modules', '@angular', 'cli', 'bin', 'ng'));
  }
  public static getPrBody(body: string, ngUpdateOutput: string) {
    return body.replace('${ngUpdateOutput}', ngUpdateOutput);
  }

  public static getPrLabels(labels?: string): string[] {
    return Helpers.toList(labels);
  }

  public static getPrAssignees(assignees?: string): string[] {
    return Helpers.toList(assignees);
  }

  public static getPrReviewers(reviewers?: string): string[] {
    return Helpers.toList(reviewers);
  }

  public static toList(value?: string): string[] {
    return value ? value.split(/,\s*/) : [];
  }

  public static computeSha1(obj: any): string {
    return hash(obj, { algorithm: 'sha1', unorderedArrays: true });
  }

}

