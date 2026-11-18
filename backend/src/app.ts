import express from "express";

export const app = express();
app.disable("x-powered-by");

// The exact /feed, /swipe, and /matches handlers are Phase 3 deliverables.
