import { SQL } from 'bun';

export const db = new SQL({
  connection: {
    application_name: 'kana-backend',
  },
});
