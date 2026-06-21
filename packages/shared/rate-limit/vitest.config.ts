import sharedConfig from "@supa-admin/vitest-config/no-setup";
import { defineConfig, mergeConfig } from "vitest/config";

export default mergeConfig(sharedConfig, defineConfig({}));
