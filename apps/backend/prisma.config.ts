import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  database: {
    url: 'file:./dev.db',
  },
  generators: [
    {
      name: 'client',
      provider: 'prisma-client-js',
    },
  ],
});
