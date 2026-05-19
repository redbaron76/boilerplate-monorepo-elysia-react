import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  outdir: 'prisma',
  datasource: {
    url: 'postgresql://boilerplate:boilerplate@10.21.0.1:5432/boilerplate',
    directUrl: 'postgresql://boilerplate:boilerplate@10.21.0.1:5432/boilerplate',
  },
});
