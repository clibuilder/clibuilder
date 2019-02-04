import cp from 'child_process';
import { pickPackagesWithKeywords } from './pickPackagesWithKeywords';

// istanbul ignore file
export function npmSearch(keywords: string[]): Promise<string[]> {
  return new Promise((a, r) => {
    cp.exec(`npm search --json --no-description ${keywords.join(' ')}`, (err, stdout) => {
      if (err) {
        r(err)
      }
      else {
        const json = JSON.parse(stdout)
        a(pickPackagesWithKeywords(json, keywords))
      }
    })
  })
}
