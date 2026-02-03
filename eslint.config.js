import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
            }
        },
        rules: {
            "indent": [
                "error",
                "tab",
                {
                    "SwitchCase": 1
                }
            ],
            "no-mixed-spaces-and-tabs": [
                "error",
                "smart-tabs"
            ],
            "no-console": "off"
        }
    },
    {
        files: ["build/**/*.js"],
        languageOptions: {
            ecmaVersion: 2025,
            sourceType: "module",
        }
    },
    {
        files: ["test/**/*.cjs"],
        languageOptions: {
            globals: {
                QUnit: "readonly"
            }
        },
        rules: {
            "no-redeclare": "off",
            "no-useless-escape": "off"
        }
    },
    {
        ignores: [
            "build/**",
            "docs/examples/**",
            "docs/examples/common.js",
            "dist/**",
            "test/lib/**",
            "test/bench/**",
            "docs/**/lib/**",
            "docs/v1/**",
            "docs/v2/**",
            "docs/v3/**",
            "docs/node_modules/**",
            "**/*.compiled.js",
            "**/*.html",
            ".eslintignore"
        ]
    }
];
