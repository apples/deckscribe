import { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
    schemaFile: 'http://localhost:5171/swagger/v1/swagger.json',
    apiFile: './src/store/apiBase.ts',
    apiImport: 'deckscribeApi',
    outputFile: './src/store/api.ts',
    exportName: 'deckscribeApi',
    hooks: true,
};

export default config;
