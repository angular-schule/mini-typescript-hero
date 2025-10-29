import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [{
    files: ["**/*.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],
        "@typescript-eslint/no-explicit-any": "error",

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
        "no-console": "error",
        "no-debugger": "error",
    },
}];