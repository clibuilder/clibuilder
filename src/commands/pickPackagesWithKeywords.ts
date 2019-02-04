import { hasAllKeywords } from './hasAllKeywords';

export function pickPackagesWithKeywords(packageInfos: Record<string, any>[], keywords: string[]) {
  return packageInfos.filter(pkg => hasAllKeywords(pkg.keywords, keywords)).map(pkg => pkg.name);
}
