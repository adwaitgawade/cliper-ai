// React 19.3's browser() API (https://react.dev/reference/react-dom/browser), not yet in
// @types/react-dom. use(browser()) suspends during server rendering and continues in the browser.
import "react-dom";

declare module "react-dom" {
  export function browser(reason?: string): Promise<void>;
}
