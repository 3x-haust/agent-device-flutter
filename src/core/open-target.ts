import type { OpenTarget } from '../contracts.js';

export function classifyOpenTarget(input: string): OpenTarget {
  if (/^[a-z][a-z0-9+\-.]*:\/\//i.test(input)) {
    return { kind: 'url', url: input };
  }
  if (input.startsWith('./') || input.startsWith('/') || input.startsWith('../')) {
    return { kind: 'local-path', path: input };
  }
  if (/\.(ipa|app|apk|aab|xcarchive)$/i.test(input)) {
    return { kind: 'local-path', path: input };
  }
  if (/^[a-z0-9][a-z0-9_]*(\.[a-z0-9][a-z0-9_-]*)+$/i.test(input)) {
    const looksLikeAndroid = /^[a-z]/.test(input) && input.includes('.');
    return looksLikeAndroid
      ? { kind: 'package', value: input }
      : { kind: 'bundle-id', value: input };
  }
  return { kind: 'local-path', path: input };
}
