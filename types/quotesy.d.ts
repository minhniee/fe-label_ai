declare module "quotesy" {
  export type Quote = { text?: string; author?: string };
  export function random(): Quote;
  const _default: { random: typeof random };
  export default _default;
}

