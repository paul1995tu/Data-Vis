import { resolve } from "path";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import dsv from "@rollup/plugin-dsv";

export default defineConfig({
    plugins: [solidPlugin(), dsv()],
    server: {
        port: 3000,
    },
    build: {
        target: "esnext",
    },
    resolve: {
        alias: [
            {
                find: "src",
                replacement: resolve(__dirname, "src"),
            },
        ],
    },
});
