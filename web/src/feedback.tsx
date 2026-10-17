import { LINKS } from './config';

/** Retain old links without reading the retired intake or asking for a signature. */
export function Feedback() {
  return <p>Feedback intake is paused. Reach us on X at <a href={LINKS.x}>@marginalia_md</a>.</p>;
}
