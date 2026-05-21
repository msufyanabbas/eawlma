// `react-pannellum` (v0.2.x) ships no TypeScript types. Minimal ambient
// declaration covering the props the listing-detail VR viewer uses.
declare module 'react-pannellum' {
  import type { Component, CSSProperties } from 'react';

  interface ReactPannellumProps {
    /** Unique DOM id for the viewer container. */
    id: string;
    /** Id of the initial scene. */
    sceneId: string;
    /** Equirectangular panorama image URL. */
    imageSource: string;
    /** Pannellum viewer config (autoRotate, compass, controls, …). */
    config?: Record<string, unknown>;
    style?: CSSProperties;
    className?: string;
  }

  export default class ReactPannellum extends Component<ReactPannellumProps> {}

  export function addScene(
    sceneId: string,
    config: Record<string, unknown>,
    callback?: () => void,
  ): void;
  export function getConfig(): Record<string, unknown>;
  export function getCurrentScene(): string;
  export function loadScene(sceneId: string): void;
}
