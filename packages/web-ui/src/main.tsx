/**
 * Entry point for web UI development
 *
 * Este archivo es para desarrollo local del package.
 * La SDK usará el runtime programáticamente.
 */

import { createWebApp } from "./create-web-app";
import { DemoApp } from "./demo/demo-app";

const app = createWebApp(DemoApp, {
  title: "OpenFarm Web UI",
  theme: "dark",
});

app.start().catch(console.error);
