import { autoCollectEvents } from "./src/events";
import { registerCredits } from "./src/features/credits";
import { registerEditor } from "./src/features/editor";
import { registerFooter } from "./src/features/footer";
import { registerFullscreen } from "./src/features/fullscreen";
import { registerPi } from "./src/features/pi";
import { registerPresets } from "./src/features/presets";
import { registerRecap } from "./src/features/recap";
import { registerSubagents } from "./src/features/subagents";
import { registerWeb } from "./src/features/web";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * pi-spark is a single extension that bundles several features. Each feature registers itself
 * like a standalone extension and reads its config via the shared, cached `loadConfig`. This file
 * is just the registry that wires them together.
 */
export default function (pi: ExtensionAPI) {
  // Own the event-bus subscription lifecycle here so features never manage cleanup themselves;
  // the collector disposes every subscription on session_shutdown.
  const events = autoCollectEvents(pi);

  registerCredits(pi);
  registerEditor(pi, events);
  registerFooter(pi);
  registerFullscreen(pi);
  registerPi(pi);
  registerPresets(pi);
  registerRecap(pi);
  registerSubagents(pi);
  registerWeb(pi);
}
