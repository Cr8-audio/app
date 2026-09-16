// convex/convex.config.ts
import { defineApp } from 'convex/server';

import agent from '@convex-dev/agent/convex.config';
import migrations from '@convex-dev/migrations/convex.config.js';

const app = defineApp();
app.use(migrations);
app.use(agent);

export default app;
