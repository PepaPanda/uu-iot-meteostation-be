import initExpress from './initExpress';
import { checkDbConnection } from './db/checkConnection';


// First try DB connection, then init express
checkDbConnection().then((db) => {
  console.log('Database connected:', db.now);
  initExpress();
}).catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});