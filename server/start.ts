import { serve } from '@hono/node-server'
import { app } from './index.js'
import { recoverCoTesterWorker } from './cotester-run-queue.js'

serve({ fetch: app.fetch, port: 8787 })
recoverCoTesterWorker().catch((error) => console.error('CoTester worker recovery failed:', error))
